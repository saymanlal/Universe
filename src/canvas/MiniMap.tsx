import { useEffect, useRef } from 'react';
import { Rng, combineSeeds } from '@/core/rng';
import { useUniverseStore } from '@/state/useUniverseStore';
import { useStatsStore } from '@/state/useStatsStore';

const MINI_W = 212;
const MINI_H = 132;
/** How many times larger than the main viewport the mini-map surveys. */
const OVERVIEW = 5;
/** World size of one sampling cell relative to the surveyed span. */
const CELLS_ACROSS = 22;
const MAX_CELLS = 1600;

/**
 * A self-contained "radar" mini-map. It runs its own draw loop reading the
 * renderer's smoothed camera imperatively, so panning/zooming never triggers
 * React re-renders. Stars are sampled deterministically from the universe seed
 * (a coarse echo of the main starfield). Click or drag to teleport — the main
 * camera eases to the target.
 */
export function MiniMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasUniverse = useUniverseStore((s) => s.activeId !== null);

  useEffect(() => {
    if (!hasUniverse) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = MINI_W * dpr;
    canvas.height = MINI_H * dpr;

    let raf = 0;
    let accum = 0;
    let last = performance.now();

    const draw = (now: number) => {
      accum += now - last;
      last = now;
      raf = requestAnimationFrame(draw);
      if (accum < 33) return; // ~30 fps is plenty for the radar
      accum = 0;

      const { view, viewport } = useStatsStore.getState();
      const seed = useUniverseStore.getState().active()?.seed ?? 0;

      // Uniform scale that fits `OVERVIEW`× the main viewport.
      const mainHalfW = viewport.w / 2 / view.zoom;
      const mainHalfH = viewport.h / 2 / view.zoom;
      const spanW = mainHalfW * 2 * OVERVIEW;
      const spanH = mainHalfH * 2 * OVERVIEW;
      const scale = Math.min(MINI_W / spanW, MINI_H / spanH);

      const toMiniX = (wx: number) => MINI_W / 2 + (wx - view.x) * scale;
      const toMiniY = (wy: number) => MINI_H / 2 + (wy - view.y) * scale;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, MINI_W, MINI_H);
      ctx.fillStyle = '#0a0c12';
      ctx.fillRect(0, 0, MINI_W, MINI_H);

      // Deterministic star dots across the surveyed region.
      const worldHalfW = MINI_W / 2 / scale;
      const worldHalfH = MINI_H / 2 / scale;
      const cellSize = Math.max(spanW, spanH) / CELLS_ACROSS;
      const minCX = Math.floor((view.x - worldHalfW) / cellSize);
      const maxCX = Math.floor((view.x + worldHalfW) / cellSize);
      const minCY = Math.floor((view.y - worldHalfH) / cellSize);
      const maxCY = Math.floor((view.y + worldHalfH) / cellSize);

      let cells = 0;
      for (let cy = minCY; cy <= maxCY && cells < MAX_CELLS; cy++) {
        for (let cx = minCX; cx <= maxCX && cells < MAX_CELLS; cx++) {
          cells++;
          const rng = new Rng(combineSeeds(seed, cx, cy, 0x11d));
          if (rng.next() > 0.7) continue; // sparse
          const wx = (cx + rng.next()) * cellSize;
          const wy = (cy + rng.next()) * cellSize;
          const b = rng.float(0.25, 0.9);
          ctx.fillStyle = `rgba(191,208,255,${b})`;
          ctx.fillRect(toMiniX(wx), toMiniY(wy), 1.2, 1.2);
        }
      }

      // Genesis point.
      ctx.beginPath();
      ctx.arc(toMiniX(0), toMiniY(0), 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#6d8bff';
      ctx.fill();

      // Current viewport rectangle.
      const rw = mainHalfW * 2 * scale;
      const rh = mainHalfH * 2 * scale;
      ctx.strokeStyle = 'rgba(143,164,255,0.9)';
      ctx.lineWidth = 1;
      ctx.strokeRect(MINI_W / 2 - rw / 2, MINI_H / 2 - rh / 2, rw, rh);
      ctx.fillStyle = 'rgba(109,139,255,0.08)';
      ctx.fillRect(MINI_W / 2 - rw / 2, MINI_H / 2 - rh / 2, rw, rh);

      // Frame border.
      ctx.strokeStyle = 'rgba(38,43,58,1)';
      ctx.strokeRect(0.5, 0.5, MINI_W - 1, MINI_H - 1);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [hasUniverse]);

  // ---- teleport interaction ----
  const teleportFromEvent = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const { view, viewport } = useStatsStore.getState();
    const mainHalfW = viewport.w / 2 / view.zoom;
    const mainHalfH = viewport.h / 2 / view.zoom;
    const spanW = mainHalfW * 2 * OVERVIEW;
    const spanH = mainHalfH * 2 * OVERVIEW;
    const scale = Math.min(MINI_W / spanW, MINI_H / spanH);
    const wx = view.x + (mx - MINI_W / 2) / scale;
    const wy = view.y + (my - MINI_H / 2) / scale;
    useUniverseStore.getState().setCamera({ x: wx, y: wy });
  };

  const dragging = useRef(false);

  if (!hasUniverse) return null;

  return (
    <div className="pointer-events-auto absolute right-3 top-3 overflow-hidden rounded-lg border border-space-700 bg-space-850/90 shadow-panel backdrop-blur">
      <div className="flex items-center justify-between px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-space-400">
        <span>Mini-map</span>
        <span className="font-mono text-space-500">radar</span>
      </div>
      <canvas
        ref={canvasRef}
        style={{ width: MINI_W, height: MINI_H, cursor: 'crosshair', display: 'block' }}
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          teleportFromEvent(e);
        }}
        onPointerMove={(e) => {
          if (dragging.current) teleportFromEvent(e);
        }}
        onPointerUp={(e) => {
          dragging.current = false;
          e.currentTarget.releasePointerCapture(e.pointerId);
        }}
      />
    </div>
  );
}
