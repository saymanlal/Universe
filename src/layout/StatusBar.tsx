import { useStatsStore } from '@/state/useStatsStore';
import { useUniverseStore } from '@/state/useUniverseStore';
import { formatSimTime } from '@/core/format';

function fmt(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 1 });
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
  const region = useStatsStore((s) => s.region);
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
      <span>zoom {camera.zoom < 0.01 ? camera.zoom.toExponential(1) : camera.zoom.toFixed(3)}×</span>
      {active && region && (
        <span className="flex items-center gap-1 text-nebula-cyan/80" title="Region under camera">
          ◍ {region}
        </span>
      )}
      <div className="ml-auto flex items-center gap-4">
        {active && <span>seed {active.seed.toString(16)}</span>}
        {active && <span className="text-accent-soft">{formatSimTime(active.simTime)}</span>}
      </div>
    </footer>
  );
}
