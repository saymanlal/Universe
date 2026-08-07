import { Application, Container, Graphics } from 'pixi.js';
import { Rng, combineSeeds } from '@/core/rng';
import type { Camera } from '@/core/types';
import { useUniverseStore } from '@/state/useUniverseStore';
import { useStatsStore } from '@/state/useStatsStore';

/** World units per background starfield chunk. */
const CHUNK_SIZE = 1600;
/** Stars generated per chunk (deterministic from seed + chunk coords). */
const STARS_PER_CHUNK = 46;
/** Hard cap so extreme zoom-out never explodes the object count. */
const MAX_VISIBLE_CHUNKS = 600;

const ZOOM_MIN = 0.04;
const ZOOM_MAX = 24;

const STAR_TINTS = [0xffffff, 0xbfd0ff, 0xfff3d6, 0xffd9b0, 0xd6c4ff, 0xc9f2ff];

/**
 * The core PixiJS viewport renderer.
 *
 * Responsibilities in Phase 1:
 *  - Own the WebGL Application and render loop.
 *  - Draw an infinite, deterministic parallax starfield using lazy per-chunk
 *    generation (only visible chunks exist as display objects).
 *  - Draw an adaptive coordinate grid and the genesis marker.
 *  - Handle pan (drag) and zoom-to-cursor (wheel), writing camera state back
 *    to the universe store as the single source of truth.
 *  - Publish live telemetry (FPS, cursor world-coords, object count).
 *
 * Later phases layer galaxies, systems and entities onto `world` without
 * changing this camera/loop foundation.
 */
export class Renderer {
  private app: Application;
  private world = new Container();
  private starLayer = new Container();
  private gridG = new Graphics();
  private markerG = new Graphics();
  private chunks = new Map<string, Container>();

  private seed = 0;
  private disposed = false;
  private unsubscribe: (() => void) | null = null;

  // interaction state
  private dragging = false;
  private lastPointer = { x: 0, y: 0 };
  private pointerScreen: { x: number; y: number } | null = null;

  // fps sampling
  private fpsAccum = 0;
  private fpsFrames = 0;

  constructor() {
    this.app = new Application();
  }

  async init(container: HTMLDivElement): Promise<void> {
    await this.app.init({
      resizeTo: container,
      backgroundColor: 0x05060a,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      preference: 'webgl',
    });
    if (this.disposed) {
      this.app.destroy(true);
      return;
    }

    container.appendChild(this.app.canvas);
    this.app.canvas.style.width = '100%';
    this.app.canvas.style.height = '100%';

    // Draw order: grid (back) -> stars -> marker.
    this.world.addChild(this.gridG);
    this.world.addChild(this.starLayer);
    this.world.addChild(this.markerG);
    this.app.stage.addChild(this.world);

    this.seed = useUniverseStore.getState().active()?.seed ?? 0;

    this.bindEvents();
    this.unsubscribe = useUniverseStore.subscribe((s) => {
      const nextSeed = s.active()?.seed ?? 0;
      if (nextSeed !== this.seed) {
        this.seed = nextSeed;
        this.clearChunks();
      }
    });

    this.app.ticker.add(this.onTick);
  }

  // ---- coordinate helpers -------------------------------------------------

  private get screenW(): number {
    return this.app.renderer.screen.width;
  }
  private get screenH(): number {
    return this.app.renderer.screen.height;
  }

  private screenToWorld(sx: number, sy: number, cam: Camera): { x: number; y: number } {
    return {
      x: (sx - this.screenW / 2) / cam.zoom + cam.x,
      y: (sy - this.screenH / 2) / cam.zoom + cam.y,
    };
  }

  // ---- events -------------------------------------------------------------

  private bindEvents() {
    const c = this.app.canvas;
    c.addEventListener('pointerdown', this.onPointerDown);
    c.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    c.addEventListener('pointerleave', this.onPointerLeave);
    c.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private unbindEvents() {
    const c = this.app.canvas;
    c.removeEventListener('pointerdown', this.onPointerDown);
    c.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    c.removeEventListener('pointerleave', this.onPointerLeave);
    c.removeEventListener('wheel', this.onWheel);
  }

  private onPointerDown = (e: PointerEvent) => {
    this.dragging = true;
    this.lastPointer = { x: e.clientX, y: e.clientY };
    this.app.canvas.style.cursor = 'grabbing';
  };

  private onPointerMove = (e: PointerEvent) => {
    const rect = this.app.canvas.getBoundingClientRect();
    this.pointerScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    if (this.dragging) {
      const cam = useUniverseStore.getState().camera;
      const dx = e.clientX - this.lastPointer.x;
      const dy = e.clientY - this.lastPointer.y;
      this.lastPointer = { x: e.clientX, y: e.clientY };
      useUniverseStore.getState().setCamera({
        x: cam.x - dx / cam.zoom,
        y: cam.y - dy / cam.zoom,
      });
    }
  };

  private onPointerUp = () => {
    if (this.dragging) {
      this.dragging = false;
      this.app.canvas.style.cursor = 'grab';
    }
  };

  private onPointerLeave = () => {
    this.pointerScreen = null;
    useStatsStore.getState().setCursor(null);
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const rect = this.app.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const cam = useUniverseStore.getState().camera;

    const before = this.screenToWorld(sx, sy, cam);
    const factor = Math.exp(-e.deltaY * 0.0015);
    const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, cam.zoom * factor));

    // Keep the world point under the cursor fixed while zooming.
    const x = before.x - (sx - this.screenW / 2) / zoom;
    const y = before.y - (sy - this.screenH / 2) / zoom;
    useUniverseStore.getState().setCamera({ x, y, zoom });
  };

  // ---- render loop --------------------------------------------------------

  private onTick = () => {
    if (this.disposed) return;
    const cam = useUniverseStore.getState().camera;

    // Apply camera transform.
    this.world.scale.set(cam.zoom);
    this.world.position.set(
      this.screenW / 2 - cam.x * cam.zoom,
      this.screenH / 2 - cam.y * cam.zoom,
    );

    this.updateStarfield(cam);
    this.drawGrid(cam);
    this.drawMarker();

    // cursor telemetry
    if (this.pointerScreen) {
      useStatsStore.getState().setCursor(
        this.screenToWorld(this.pointerScreen.x, this.pointerScreen.y, cam),
      );
    }

    // fps sampling (~4 updates/sec)
    this.fpsAccum += this.app.ticker.deltaMS;
    this.fpsFrames += 1;
    if (this.fpsAccum >= 250) {
      useStatsStore.getState().setFps((this.fpsFrames * 1000) / this.fpsAccum);
      this.fpsAccum = 0;
      this.fpsFrames = 0;
    }
  };

  // ---- starfield (lazy, chunked, deterministic) ---------------------------

  private buildChunk(cx: number, cy: number): Container {
    const rng = new Rng(combineSeeds(this.seed, cx, cy, 0x51a7));
    const g = new Graphics();
    for (let i = 0; i < STARS_PER_CHUNK; i++) {
      const x = cx * CHUNK_SIZE + rng.float(0, CHUNK_SIZE);
      const y = cy * CHUNK_SIZE + rng.float(0, CHUNK_SIZE);
      const r = rng.float(0.6, 2.4);
      const alpha = rng.float(0.25, 0.95);
      const tint = rng.pick(STAR_TINTS);
      g.circle(x, y, r).fill({ color: tint, alpha });
    }
    const chunk = new Container();
    chunk.addChild(g);
    return chunk;
  }

  private updateStarfield(cam: Camera) {
    const halfW = this.screenW / 2 / cam.zoom;
    const halfH = this.screenH / 2 / cam.zoom;
    const minCX = Math.floor((cam.x - halfW) / CHUNK_SIZE);
    const maxCX = Math.floor((cam.x + halfW) / CHUNK_SIZE);
    const minCY = Math.floor((cam.y - halfH) / CHUNK_SIZE);
    const maxCY = Math.floor((cam.y + halfH) / CHUNK_SIZE);

    const wanted = new Set<string>();
    let count = 0;
    for (let cy = minCY; cy <= maxCY; cy++) {
      for (let cx = minCX; cx <= maxCX; cx++) {
        if (count >= MAX_VISIBLE_CHUNKS) break;
        const key = `${cx},${cy}`;
        wanted.add(key);
        if (!this.chunks.has(key)) {
          const chunk = this.buildChunk(cx, cy);
          this.chunks.set(key, chunk);
          this.starLayer.addChild(chunk);
        }
        count++;
      }
    }

    // Recycle chunks that scrolled out of view.
    for (const [key, chunk] of this.chunks) {
      if (!wanted.has(key)) {
        this.starLayer.removeChild(chunk);
        chunk.destroy({ children: true });
        this.chunks.delete(key);
      }
    }

    useStatsStore.getState().setDrawn(this.chunks.size * STARS_PER_CHUNK);
  }

  private clearChunks() {
    for (const [, chunk] of this.chunks) {
      this.starLayer.removeChild(chunk);
      chunk.destroy({ children: true });
    }
    this.chunks.clear();
  }

  // ---- adaptive grid ------------------------------------------------------

  private drawGrid(cam: Camera) {
    const g = this.gridG;
    g.clear();

    // Target ~90px between grid lines; snap to a 1-2-5 x 10ⁿ step.
    const raw = 90 / cam.zoom;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const step = (norm < 2 ? 2 : norm < 5 ? 5 : 10) * mag;

    const halfW = this.screenW / 2 / cam.zoom;
    const halfH = this.screenH / 2 / cam.zoom;
    const left = cam.x - halfW;
    const right = cam.x + halfW;
    const top = cam.y - halfH;
    const bottom = cam.y + halfH;

    const startX = Math.floor(left / step) * step;
    const startY = Math.floor(top / step) * step;
    const lineW = 1 / cam.zoom;

    for (let x = startX; x <= right; x += step) {
      const axis = Math.abs(x) < step * 0.5;
      g.moveTo(x, top).lineTo(x, bottom).stroke({
        width: axis ? lineW * 1.6 : lineW,
        color: axis ? 0x3d4d8f : 0x1d212e,
        alpha: axis ? 0.9 : 0.6,
      });
    }
    for (let y = startY; y <= bottom; y += step) {
      const axis = Math.abs(y) < step * 0.5;
      g.moveTo(left, y).lineTo(right, y).stroke({
        width: axis ? lineW * 1.6 : lineW,
        color: axis ? 0x3d4d8f : 0x1d212e,
        alpha: axis ? 0.9 : 0.6,
      });
    }
  }

  private drawMarker() {
    const g = this.markerG;
    g.clear();
    // Genesis point at the universe origin.
    g.circle(0, 0, 6).fill({ color: 0x6d8bff, alpha: 0.9 });
    g.circle(0, 0, 12).stroke({ width: 1.5, color: 0x6d8bff, alpha: 0.5 });
  }

  // ---- imperative camera helpers (used by God tools) ----------------------

  /** Smoothly is not required yet; snap the camera home. */
  resetCamera() {
    useUniverseStore.getState().setCamera({ x: 0, y: 0, zoom: 1 });
  }

  destroy() {
    this.disposed = true;
    this.unsubscribe?.();
    this.unbindEvents();
    this.clearChunks();
    this.app.ticker.remove(this.onTick);
    try {
      this.app.destroy(true, { children: true });
    } catch {
      /* already torn down */
    }
  }
}
