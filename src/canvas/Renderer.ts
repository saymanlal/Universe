import { Application, Container, Graphics, Text } from 'pixi.js';
import { Rng, combineSeeds } from '@/core/rng';
import { formatCompact } from '@/core/format';
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

/** Camera easing stiffness (higher = snappier). Exponential smoothing. */
const CAM_STIFFNESS = 16;
/** Keyboard pan speed in screen-pixels per second (scaled by zoom). */
const KEY_PAN_SPEED = 900;
/** Below this delta the display camera snaps to the target (kills jitter). */
const CAM_EPSILON = 0.01;

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
  private labelLayer = new Container();
  private labelPool: Text[] = [];
  private chunks = new Map<string, Container>();

  private seed = 0;
  private disposed = false;
  private unsubscribe: (() => void) | null = null;

  /**
   * Smoothed camera actually drawn this frame. It eases toward the store
   * camera (the target/source-of-truth) so wheel zoom, teleports and keyboard
   * moves glide instead of snapping. Dragging bypasses easing for a 1:1 feel.
   */
  private display: Camera = { x: 0, y: 0, zoom: 1 };

  // interaction state
  private dragging = false;
  private lastPointer = { x: 0, y: 0 };
  private pointerScreen: { x: number; y: number } | null = null;
  private keys = new Set<string>();

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

    // Draw order: grid (back) -> stars -> marker, all inside the scaled world.
    this.world.addChild(this.gridG);
    this.world.addChild(this.starLayer);
    this.world.addChild(this.markerG);
    this.app.stage.addChild(this.world);
    // Coordinate labels live in screen space so they stay pixel-crisp at any zoom.
    this.app.stage.addChild(this.labelLayer);

    this.seed = useUniverseStore.getState().active()?.seed ?? 0;
    this.display = { ...useUniverseStore.getState().camera };

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
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private unbindEvents() {
    const c = this.app.canvas;
    c.removeEventListener('pointerdown', this.onPointerDown);
    c.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    c.removeEventListener('pointerleave', this.onPointerLeave);
    c.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  /** True while the user is typing into a form control (don't hijack keys). */
  private isTypingTarget(): boolean {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || (el as HTMLElement).isContentEditable;
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.isTypingTarget()) return;
    const k = e.key.toLowerCase();
    if (k === 'home' || k === '0') {
      this.resetCamera();
      return;
    }
    this.keys.add(k);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };

  /** Apply continuous keyboard pan/zoom to the target camera each frame. */
  private applyKeyboard(dtSec: number) {
    if (this.keys.size === 0) return;
    const cam = useUniverseStore.getState().camera;
    let { x, y, zoom } = cam;
    const step = (KEY_PAN_SPEED * dtSec) / zoom;

    if (this.keys.has('arrowleft') || this.keys.has('a')) x -= step;
    if (this.keys.has('arrowright') || this.keys.has('d')) x += step;
    if (this.keys.has('arrowup') || this.keys.has('w')) y -= step;
    if (this.keys.has('arrowdown') || this.keys.has('s')) y += step;

    const zoomRate = Math.exp(1.6 * dtSec);
    if (this.keys.has('=') || this.keys.has('+')) zoom = Math.min(ZOOM_MAX, zoom * zoomRate);
    if (this.keys.has('-') || this.keys.has('_')) zoom = Math.max(ZOOM_MIN, zoom / zoomRate);

    if (x !== cam.x || y !== cam.y || zoom !== cam.zoom) {
      useUniverseStore.getState().setCamera({ x, y, zoom });
    }
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
    // Anchor on the *displayed* camera so the world point under the cursor
    // stays put even mid-ease.
    const cam = this.display;

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
    const dtSec = Math.min(0.1, this.app.ticker.deltaMS / 1000);

    // Continuous keyboard navigation feeds the target camera.
    this.applyKeyboard(dtSec);

    // Ease the display camera toward the store target for smooth rendering.
    const target = useUniverseStore.getState().camera;
    if (this.dragging) {
      this.display = { ...target };
    } else {
      const t = 1 - Math.exp(-CAM_STIFFNESS * dtSec);
      this.display.x += (target.x - this.display.x) * t;
      this.display.y += (target.y - this.display.y) * t;
      // Zoom eases in log space so it feels perceptually linear.
      const logZoom = Math.log(this.display.zoom);
      this.display.zoom = Math.exp(logZoom + (Math.log(target.zoom) - logZoom) * t);
      if (Math.abs(target.x - this.display.x) < CAM_EPSILON) this.display.x = target.x;
      if (Math.abs(target.y - this.display.y) < CAM_EPSILON) this.display.y = target.y;
      if (Math.abs(target.zoom - this.display.zoom) < CAM_EPSILON * this.display.zoom) {
        this.display.zoom = target.zoom;
      }
    }
    const cam = this.display;

    // Apply camera transform.
    this.world.scale.set(cam.zoom);
    this.world.position.set(
      this.screenW / 2 - cam.x * cam.zoom,
      this.screenH / 2 - cam.y * cam.zoom,
    );

    this.updateStarfield(cam);
    this.drawGrid(cam);
    this.drawMarker();
    this.drawLabels(cam);

    // Publish the smoothed camera for the mini-map / HUD (imperative, no re-render).
    useStatsStore.getState().setView({ ...cam });
    useStatsStore.getState().setViewport({ w: this.screenW, h: this.screenH });

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

  /** Adaptive grid spacing in world units, snapped to a 1-2-5 × 10ⁿ scale. */
  private gridStep(zoom: number): number {
    const raw = 90 / zoom;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    return (norm < 2 ? 2 : norm < 5 ? 5 : 10) * mag;
  }

  private worldToScreen(wx: number, wy: number, cam: Camera): { x: number; y: number } {
    return {
      x: (wx - cam.x) * cam.zoom + this.screenW / 2,
      y: (wy - cam.y) * cam.zoom + this.screenH / 2,
    };
  }

  private drawGrid(cam: Camera) {
    const g = this.gridG;
    g.clear();

    const step = this.gridStep(cam.zoom);

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

  // ---- coordinate labels (screen-space, pooled Text) ----------------------

  private acquireLabel(index: number): Text {
    let label = this.labelPool[index];
    if (!label) {
      label = new Text({
        text: '',
        style: {
          fill: 0x6b7488,
          fontSize: 10,
          fontFamily: 'JetBrains Mono, ui-monospace, monospace',
        },
      });
      this.labelPool[index] = label;
      this.labelLayer.addChild(label);
    }
    return label;
  }

  private drawLabels(cam: Camera) {
    const step = this.gridStep(cam.zoom);
    const halfW = this.screenW / 2 / cam.zoom;
    const halfH = this.screenH / 2 / cam.zoom;
    const left = cam.x - halfW;
    const right = cam.x + halfW;
    const top = cam.y - halfH;
    const bottom = cam.y + halfH;

    let used = 0;
    // Vertical grid-line labels along the top edge.
    for (let x = Math.floor(left / step) * step; x <= right; x += step) {
      const s = this.worldToScreen(x, 0, cam);
      const label = this.acquireLabel(used++);
      label.text = formatCompact(x);
      label.x = s.x + 3;
      label.y = 4;
      label.alpha = Math.abs(x) < step * 0.5 ? 0.95 : 0.55;
      label.visible = true;
    }
    // Horizontal grid-line labels along the left edge.
    for (let y = Math.floor(top / step) * step; y <= bottom; y += step) {
      const s = this.worldToScreen(0, y, cam);
      const label = this.acquireLabel(used++);
      label.text = formatCompact(y);
      label.x = 4;
      label.y = s.y + 2;
      label.alpha = Math.abs(y) < step * 0.5 ? 0.95 : 0.55;
      label.visible = true;
    }
    // Hide any pooled labels not needed this frame.
    for (let i = used; i < this.labelPool.length; i++) {
      this.labelPool[i]!.visible = false;
    }
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
