import { Application, Container, Graphics, Text } from 'pixi.js';
import { Rng, combineSeeds } from '@/core/rng';
import { formatCompact } from '@/core/format';
import type { Camera, Selection } from '@/core/types';
import {
  STAR_CHUNK_SIZE,
  generateChunkStars,
  clearStarCache,
  nearestStar,
  findStarById,
} from '@/sim/starfield';
import type { Star } from '@/sim/star';
import {
  galaxiesInRect,
  galaxyAt,
  findGalaxyById,
  clearGalaxyCache,
  type Galaxy,
} from '@/sim/galaxy';
import {
  generateSystem,
  planetPosition,
  moonPosition,
  resolveOrbitId,
  clearSystemCache,
  type Planet,
} from '@/sim/planet';
import { computeProfile, clearProfileCache } from '@/sim/planetProfile';
import { ZOOM_MIN, ZOOM_MAX, starDetail, systemDetail } from '@/canvas/viewport';
import { useUniverseStore } from '@/state/useUniverseStore';
import { useStatsStore } from '@/state/useStatsStore';
import { useUiStore } from '@/state/useUiStore';
import { useEditsStore } from '@/state/useEditsStore';

/** World units per star chunk (shared with the star field generator). */
const CHUNK_SIZE = STAR_CHUNK_SIZE;
/** Hard cap so extreme zoom-out never explodes the object count. */
const MAX_VISIBLE_CHUNKS = 520;
/** Hard cap on galaxy display objects at once. */
const MAX_VISIBLE_GALAXIES = 300;
/** Below this star-detail the star layer is skipped entirely (LOD). */
const STAR_LAYER_MIN_ALPHA = 0.02;

/** Camera easing stiffness (higher = snappier). Exponential smoothing. */
const CAM_STIFFNESS = 16;
/** Keyboard pan speed in screen-pixels per second (scaled by zoom). */
const KEY_PAN_SPEED = 900;
/** Below this delta the display camera snaps to the target (kills jitter). */
const CAM_EPSILON = 0.01;
/** Click vs drag threshold in screen pixels. */
const CLICK_SLOP = 4;
/** A glow halo is drawn only for stars at least this large (perf). */
const GLOW_MIN_RADIUS = 2.2;

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
  private galaxyLayer = new Container();
  private starLayer = new Container();
  private systemG = new Graphics();
  private gridG = new Graphics();
  private markerG = new Graphics();
  private selectionG = new Graphics();
  private labelLayer = new Container();
  private labelPool: Text[] = [];
  private chunks = new Map<string, Container>();
  private galaxyObjs = new Map<string, Container>();
  private lastRegion: string | null = null;
  /** The star whose system is currently focused (nearest the camera centre). */
  private focusedStar: Star | null = null;
  private focusedPlanets: Planet[] = [];

  private seed = 0;
  private disposed = false;
  private unsubscribe: (() => void) | null = null;
  private unsubscribeEdits: (() => void) | null = null;

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
  /** Where the pointer went down (screen px) + whether it moved past slop. */
  private downAt: { x: number; y: number } | null = null;
  private movedSinceDown = false;
  private drawnStars = 0;
  private drawnGalaxies = 0;

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

    // Draw order: grid -> galaxies -> stars -> selection -> marker (scaled world).
    this.world.addChild(this.gridG);
    this.world.addChild(this.galaxyLayer);
    this.world.addChild(this.starLayer);
    this.world.addChild(this.systemG);
    this.world.addChild(this.selectionG);
    this.world.addChild(this.markerG);
    this.app.stage.addChild(this.world);
    // Coordinate labels live in screen space so they stay pixel-crisp at any zoom.
    this.app.stage.addChild(this.labelLayer);

    this.seed = useUniverseStore.getState().active()?.seed ?? 0;
    this.display = { ...useUniverseStore.getState().camera };

    this.bindEvents();

    // Rebuild displayed star chunks whenever the God-Mode edit set changes.
    this.unsubscribeEdits = useEditsStore.subscribe((s, prev) => {
      if (s.version !== prev.version) this.clearChunks();
    });

    this.unsubscribe = useUniverseStore.subscribe((s) => {
      const nextSeed = s.active()?.seed ?? 0;
      if (nextSeed !== this.seed) {
        this.seed = nextSeed;
        clearStarCache();
        clearGalaxyCache();
        clearSystemCache();
        clearProfileCache();
        this.clearChunks();
        this.clearGalaxies();
        this.systemG.clear();
        this.focusedStar = null;
        this.focusedPlanets = [];
        this.lastRegion = null;
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
    this.movedSinceDown = false;
    this.downAt = { x: e.clientX, y: e.clientY };
    this.lastPointer = { x: e.clientX, y: e.clientY };
    this.app.canvas.style.cursor = 'grabbing';
  };

  private onPointerMove = (e: PointerEvent) => {
    const rect = this.app.canvas.getBoundingClientRect();
    this.pointerScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    if (this.dragging) {
      if (this.downAt) {
        const md = Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y);
        if (md > CLICK_SLOP) this.movedSinceDown = true;
      }
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

  private onPointerUp = (e: PointerEvent) => {
    if (this.dragging) {
      this.dragging = false;
      this.app.canvas.style.cursor = this.toolCursor();
      // A click (no meaningful drag) triggers the active tool or selection.
      if (!this.movedSinceDown && this.downAt) {
        const rect = this.app.canvas.getBoundingClientRect();
        this.handleClick(
          e.clientX - rect.left,
          e.clientY - rect.top,
          e.shiftKey || e.ctrlKey || e.metaKey,
        );
      }
      this.downAt = null;
    }
  };

  private toolCursor(): string {
    return useUiStore.getState().godTool === 'none' ? 'grab' : 'crosshair';
  }

  /** Handle a click: run the armed God tool, else select (additive with modifier). */
  private handleClick(sx: number, sy: number, additive: boolean) {
    const w = this.screenToWorld(sx, sy, this.display);
    const ui = useUiStore.getState();
    const uni = useUniverseStore.getState();
    const seed = uni.active()?.seed ?? 0;

    if (ui.godTool === 'spawn') {
      const star = useEditsStore.getState().spawnStarAt(seed, w.x, w.y);
      if (star) {
        uni.setSelection({
          kind: 'star',
          id: star.id,
          label: star.name ?? star.designation,
          position: { x: star.x, y: star.y },
        });
      }
      ui.setGodTool('none');
      this.app.canvas.style.cursor = 'grab';
      return;
    }

    if (ui.godTool === 'move') {
      const primary = uni.selection;
      if (primary && primary.kind === 'star') {
        const moved = useEditsStore.getState().moveStarTo(primary.id, w.x, w.y);
        if (moved) {
          uni.setSelection({
            kind: 'star',
            id: moved.id,
            label: moved.name ?? moved.designation,
            position: { x: moved.x, y: moved.y },
          });
        }
      }
      ui.setGodTool('none');
      this.app.canvas.style.cursor = 'grab';
      return;
    }

    const picked = this.pickSelectionAt(w.x, w.y);
    if (additive) {
      if (picked) uni.toggleSelection(picked);
    } else {
      uni.setSelection(picked);
    }
  }

  /** Hit-test the scene at a world point and return a selection descriptor (LOD-aware). */
  private pickSelectionAt(wx: number, wy: number): Selection | null {
    const detail = starDetail(this.display.zoom);

    // Deepest LOD first: planets/moons of the focused system.
    if (systemDetail(this.display.zoom) > 0.5 && this.focusedStar) {
      const pick = this.pickOrbit(wx, wy, 10 / this.display.zoom);
      if (pick) return pick;
    }

    // Zoomed out → galaxies; zoomed in → stars.
    if (detail < 0.5) {
      const g = galaxyAt(this.seed, wx, wy);
      if (g) {
        return { kind: 'galaxy', id: g.id, label: g.name ?? g.designation, position: { x: g.x, y: g.y } };
      }
    }

    const star = nearestStar(this.seed, wx, wy, 12 / this.display.zoom);
    if (star) {
      return {
        kind: 'star',
        id: star.id,
        label: star.name ?? star.designation,
        position: { x: star.x, y: star.y },
      };
    }
    return null;
  }

  /** Nearest planet/moon of the focused system to a world point, or null. */
  private pickOrbit(wx: number, wy: number, pickR: number): Selection | null {
    if (!this.focusedStar) return null;
    const star = this.focusedStar;
    const simTime = useUniverseStore.getState().active()?.simTime ?? 0;
    let best: Selection | null = null;
    let bestD = Infinity;

    for (const planet of this.focusedPlanets) {
      const p = planetPosition(star, planet, simTime);
      const dp = Math.hypot(p.x - wx, p.y - wy);
      if (dp <= Math.max(pickR, planet.radius) && dp < bestD) {
        bestD = dp;
        best = { kind: 'planet', id: planet.id, label: planet.name, position: p };
      }
      for (const moon of planet.moons) {
        const mp = moonPosition(star, planet, moon, simTime);
        const dm = Math.hypot(mp.x - wx, mp.y - wy);
        if (dm <= Math.max(pickR * 0.8, moon.radius) && dm < bestD) {
          bestD = dm;
          best = { kind: 'moon', id: moon.id, label: moon.name, position: mp };
        }
      }
    }
    return best;
  }

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

    // Level of detail: crossfade between the galaxy view and the star view.
    const detail = starDetail(cam.zoom);
    this.starLayer.alpha = detail;
    this.galaxyLayer.alpha = 1 - detail;

    if (detail > STAR_LAYER_MIN_ALPHA) {
      this.starLayer.visible = true;
      this.updateStarfield(cam);
    } else {
      this.starLayer.visible = false;
      if (this.chunks.size) this.clearChunks();
      this.drawnStars = 0;
    }

    if (detail < 1 - STAR_LAYER_MIN_ALPHA) {
      this.galaxyLayer.visible = true;
      this.updateGalaxies(cam);
    } else {
      this.galaxyLayer.visible = false;
      if (this.galaxyObjs.size) this.clearGalaxies();
      this.drawnGalaxies = 0;
    }

    // Solar-system overlay (only when zoomed into a star).
    this.updateSystem(cam);

    this.drawGrid(cam);
    this.drawMarker();
    this.drawSelection(cam);
    this.drawLabels(cam);
    this.updateRegion(cam);

    useStatsStore.getState().setDrawn(detail >= 0.5 ? this.drawnStars : this.drawnGalaxies);

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
    const stars = generateChunkStars(this.seed, cx, cy);
    const g = new Graphics();
    for (const s of stars) {
      // Soft halo for the brighter stars, then the core.
      if (s.renderRadius >= GLOW_MIN_RADIUS) {
        g.circle(s.x, s.y, s.renderRadius * 2.4).fill({ color: s.color, alpha: 0.1 });
      }
      g.circle(s.x, s.y, s.renderRadius).fill({ color: s.color, alpha: 0.95 });
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
    let starTotal = 0;
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
        starTotal += generateChunkStars(this.seed, cx, cy).length;
        count++;
      }
    }
    this.drawnStars = starTotal;

    // Recycle chunks that scrolled out of view.
    for (const [key, chunk] of this.chunks) {
      if (!wanted.has(key)) {
        this.starLayer.removeChild(chunk);
        chunk.destroy({ children: true });
        this.chunks.delete(key);
      }
    }
  }

  private clearChunks() {
    for (const [, chunk] of this.chunks) {
      this.starLayer.removeChild(chunk);
      chunk.destroy({ children: true });
    }
    this.chunks.clear();
  }

  // ---- galaxies (LOD, culled, cached, deterministic) ----------------------

  private buildGalaxyVisual(g: Galaxy): Container {
    const container = new Container();
    container.position.set(g.x, g.y);
    container.rotation = g.rotation;

    const gfx = new Graphics();
    const r = g.radius;
    const ecc = g.eccentricity;

    // Faint disk halo.
    gfx.ellipse(0, 0, r, r * ecc).fill({ color: g.color, alpha: 0.06 });
    // Core glow.
    gfx.circle(0, 0, r * 0.16).fill({ color: g.coreColor, alpha: 0.5 });
    gfx.circle(0, 0, r * 0.07).fill({ color: 0xffffff, alpha: 0.85 });

    const rng = new Rng(combineSeeds(g.cell.gx, g.cell.gy, 0x9a1a));

    if (g.type === 'spiral') {
      const turns = 2.2;
      const dots = 170;
      for (let i = 0; i < dots; i++) {
        const arm = i % g.armCount;
        const t = i / dots;
        const ang =
          t * turns * Math.PI * 2 +
          (arm * Math.PI * 2) / g.armCount +
          rng.gaussian(0, 0.12);
        const rad = t * r * (0.9 + rng.gaussian(0, 0.06));
        const x = Math.cos(ang) * rad;
        const y = Math.sin(ang) * rad * ecc;
        const a = (1 - t) * 0.7 + 0.1;
        gfx.circle(x, y, r * 0.012 + (1 - t) * r * 0.01).fill({ color: g.color, alpha: a });
      }
    } else if (g.type === 'elliptical') {
      const dots = 150;
      for (let i = 0; i < dots; i++) {
        const rad = Math.min(1, Math.abs(rng.gaussian(0, 0.42))) * r;
        const ang = rng.float(0, Math.PI * 2);
        const x = Math.cos(ang) * rad;
        const y = Math.sin(ang) * rad * ecc;
        gfx.circle(x, y, r * 0.014).fill({ color: g.color, alpha: 0.5 - (rad / r) * 0.35 });
      }
    } else {
      // Irregular: a few offset clumps.
      const clumps = 5;
      for (let c = 0; c < clumps; c++) {
        const cxp = rng.float(-0.5, 0.5) * r;
        const cyp = rng.float(-0.5, 0.5) * r * ecc;
        for (let i = 0; i < 30; i++) {
          const x = cxp + rng.gaussian(0, r * 0.18);
          const y = cyp + rng.gaussian(0, r * 0.18);
          gfx.circle(x, y, r * 0.016).fill({ color: g.color, alpha: 0.4 });
        }
      }
    }

    container.addChild(gfx);
    return container;
  }

  private updateGalaxies(cam: Camera) {
    const halfW = this.screenW / 2 / cam.zoom;
    const halfH = this.screenH / 2 / cam.zoom;
    const galaxies = galaxiesInRect(
      this.seed,
      cam.x - halfW,
      cam.y - halfH,
      cam.x + halfW,
      cam.y + halfH,
      MAX_VISIBLE_GALAXIES,
    );

    const wanted = new Set<string>();
    for (const g of galaxies) {
      wanted.add(g.id);
      if (!this.galaxyObjs.has(g.id)) {
        const obj = this.buildGalaxyVisual(g);
        this.galaxyObjs.set(g.id, obj);
        this.galaxyLayer.addChild(obj);
      }
    }
    for (const [id, obj] of this.galaxyObjs) {
      if (!wanted.has(id)) {
        this.galaxyLayer.removeChild(obj);
        obj.destroy({ children: true });
        this.galaxyObjs.delete(id);
      }
    }
    this.drawnGalaxies = this.galaxyObjs.size;
  }

  private clearGalaxies() {
    for (const [, obj] of this.galaxyObjs) {
      this.galaxyLayer.removeChild(obj);
      obj.destroy({ children: true });
    }
    this.galaxyObjs.clear();
  }

  /** Publish the galaxy under the camera centre as the current "region". */
  private updateRegion(cam: Camera) {
    const g = galaxyAt(this.seed, cam.x, cam.y);
    const region = g ? (g.name ?? g.designation) : 'Intergalactic space';
    if (region !== this.lastRegion) {
      this.lastRegion = region;
      useStatsStore.getState().setRegion(region);
    }
  }

  // ---- solar system overlay (animated orbits, deterministic) --------------

  private updateSystem(cam: Camera) {
    const g = this.systemG;
    g.clear();
    const detail = systemDetail(cam.zoom);
    if (detail <= 0.01) {
      this.focusedStar = null;
      this.focusedPlanets = [];
      return;
    }

    // Focus the star nearest the camera centre (its system fills the view).
    const star = nearestStar(this.seed, cam.x, cam.y, 320);
    if (!star) {
      this.focusedStar = null;
      this.focusedPlanets = [];
      return;
    }
    if (!this.focusedStar || this.focusedStar.id !== star.id) {
      this.focusedStar = star;
      this.focusedPlanets = generateSystem(star);
    }

    const simTime = useUniverseStore.getState().active()?.simTime ?? 0;
    const lw = 1 / cam.zoom;

    // Central star, enlarged for the system view.
    const sr = 3 + Math.min(6, Math.log10(1 + star.luminosity) * 2.2);
    g.circle(star.x, star.y, sr * 2.2).fill({ color: star.color, alpha: 0.12 * detail });
    g.circle(star.x, star.y, sr).fill({ color: star.color, alpha: 0.9 * detail });
    g.circle(star.x, star.y, sr * 0.55).fill({ color: 0xffffff, alpha: 0.9 * detail });

    for (const planet of this.focusedPlanets) {
      // Orbit path.
      g.circle(star.x, star.y, planet.orbitRadius).stroke({
        width: lw,
        color: 0x38406a,
        alpha: 0.55 * detail,
      });
      const p = planetPosition(star, planet, simTime);
      // Atmosphere halo (thin/temperate atmospheres only; giants excluded).
      const profile = computeProfile(planet, star);
      const press = profile.atmosphere.pressure;
      if (planet.type !== 'gas' && planet.type !== 'iceGiant' && press > 0.05) {
        const haze = profile.waterCoverage > 0.2 ? 0x9fd8ff : 0xd8c9a8;
        g.circle(p.x, p.y, planet.radius * 1.7).fill({
          color: haze,
          alpha: Math.min(0.28, (Math.min(press, 3) / 3) * 0.3) * detail,
        });
      }
      // Moons + their orbits (drawn under the planet).
      for (const moon of planet.moons) {
        g.circle(p.x, p.y, moon.orbitRadius).stroke({
          width: lw,
          color: 0x2c3350,
          alpha: 0.4 * detail,
        });
        const mp = moonPosition(star, planet, moon, simTime);
        g.circle(mp.x, mp.y, moon.radius).fill({ color: moon.color, alpha: 0.9 * detail });
      }
      // Planet.
      g.circle(p.x, p.y, planet.radius).fill({ color: planet.color, alpha: detail });
    }
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

  /** Highlight rings around every selected entity (multi-select aware). */
  private drawSelection(cam: Camera) {
    const g = this.selectionG;
    g.clear();
    const { selection, selections } = useUniverseStore.getState();
    if (selections.length === 0) return;
    const simTime = useUniverseStore.getState().active()?.simTime ?? 0;
    const lw = 1.5 / cam.zoom;

    for (const sel of selections) {
      if (!sel.position) continue;
      const primary = selection != null && sel.id === selection.id;

      // Resolve a live position + ring radius by kind. Orbiting bodies move,
      // so they are recomputed from the sim clock rather than the click-time
      // position. Deleted/moved stars may no longer resolve → skip.
      let px = sel.position.x;
      let py = sel.position.y;
      let r = 14 / cam.zoom;

      if (sel.kind === 'galaxy') {
        const gal = findGalaxyById(sel.id);
        if (!gal) continue;
        r = gal.radius * 1.12;
      } else if (sel.kind === 'planet' || sel.kind === 'moon') {
        const resolved = resolveOrbitId(sel.id);
        if (!resolved) continue;
        const { star, planet, moon } = resolved;
        const pos = moon
          ? moonPosition(star, planet, moon, simTime)
          : planetPosition(star, planet, simTime);
        px = pos.x;
        py = pos.y;
        const rad = moon ? moon.radius : planet.radius;
        r = Math.max(rad * 1.8, 9 / cam.zoom);
      } else if (sel.kind === 'star') {
        const star = findStarById(sel.id);
        if (!star) continue; // e.g. deleted by a God edit
        px = star.x;
        py = star.y;
      }

      const color = primary ? 0xa9bbff : 0x6d8bff;
      const alpha = primary ? 0.95 : 0.7;
      g.circle(px, py, r).stroke({ width: lw, color, alpha });
      const t = 5 / cam.zoom;
      g.moveTo(px - r - t, py)
        .lineTo(px - r, py)
        .moveTo(px + r, py)
        .lineTo(px + r + t, py)
        .stroke({ width: lw, color, alpha: alpha * 0.85 });
    }
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
    this.unsubscribeEdits?.();
    this.unbindEvents();
    this.clearChunks();
    this.clearGalaxies();
    this.app.ticker.remove(this.onTick);
    try {
      this.app.destroy(true, { children: true });
    } catch {
      /* already torn down */
    }
  }
}
