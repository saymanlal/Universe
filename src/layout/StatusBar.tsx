import { useStatsStore } from '@/state/useStatsStore';
import { useUniverseStore } from '@/state/useUniverseStore';

function fmt(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

/** Formats simulation seconds into a compact Y/D/H clock. */
function formatSimTime(seconds: number): string {
  const y = Math.floor(seconds / 31557600);
  const d = Math.floor((seconds % 31557600) / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  return `Y${y} · D${d} · ${String(h).padStart(2, '0')}h`;
}

/**
 * The bottom status bar: performance HUD, cursor coordinates, zoom, and the
 * simulation clock. Values come from the lightweight stats store so updates
 * stay cheap at 60 FPS.
 */
export function StatusBar() {
  const fps = useStatsStore((s) => s.fps);
  const drawn = useStatsStore((s) => s.drawn);
  const cursor = useStatsStore((s) => s.cursor);
  const camera = useUniverseStore((s) => s.camera);
  const active = useUniverseStore((s) => s.active());

  const fpsColor = fps >= 55 ? 'text-emerald-400' : fps >= 30 ? 'text-amber-400' : 'text-rose-400';

  return (
    <footer className="flex h-6 shrink-0 items-center gap-4 border-t border-space-700 bg-space-900 px-3 font-mono text-[11px] text-space-400">
      <span className={fpsColor} title="Frames per second">
        {fmt(fps)} FPS
      </span>
      <span title="Objects drawn this frame">{drawn} objs</span>
      <div className="h-3 w-px bg-space-700" />
      <span>
        x {cursor ? fmt(cursor.x) : '—'} &nbsp; y {cursor ? fmt(cursor.y) : '—'}
      </span>
      <span>zoom {camera.zoom.toFixed(3)}×</span>
      <div className="ml-auto flex items-center gap-4">
        {active && <span>seed {active.seed.toString(16)}</span>}
        {active && <span className="text-accent-soft">{formatSimTime(active.simTime)}</span>}
      </div>
    </footer>
  );
}
