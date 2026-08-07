import { useUniverseStore } from '@/state/useUniverseStore';
import { Rng } from '@/core/rng';

export function MultiverseViewPage() {
  const universes = useUniverseStore((s) => s.universes);
  const activeId = useUniverseStore((s) => s.activeId);
  const setActive = useUniverseStore((s) => s.setActive);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-space-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Multiverse Continuum Map</h1>
          <p className="text-sm text-space-400 mt-1">2D spatial topology showing all parallel universes in hyperspace</p>
        </div>
      </div>

      <div className="bg-space-900/60 border border-space-800 rounded-xl p-6 relative overflow-hidden min-h-[400px] flex items-center justify-center">
        <svg className="w-full h-80" viewBox="0 0 800 300">
          {universes.map((u, index) => {
            const rng = new Rng(u.seed);
            const cx = 150 + (index % 4) * 180 + rng.float(-20, 20);
            const cy = 80 + Math.floor(index / 4) * 100 + rng.float(-15, 15);
            const isActive = u.id === activeId;

            return (
              <g key={u.id} className="cursor-pointer" onClick={() => setActive(u.id)}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={isActive ? 24 : 18}
                  className={`${isActive ? 'fill-accent/40 stroke-accent stroke-2 animate-pulse' : 'fill-space-800 stroke-space-600 hover:stroke-accent-cyan'} transition-all`}
                />
                <text x={cx} y={cy + 4} textAnchor="middle" fill="#ffffff" fontSize="11" className="font-semibold select-none">
                  U{index + 1}
                </text>
                <text x={cx} y={cy + 36} textAnchor="middle" fill="#94a3b8" fontSize="10" className="font-mono">
                  {u.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="bg-space-900/40 border border-space-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-2">Hyperspace Telemetry</h3>
        <p className="text-xs text-space-400">
          Showing {universes.length} total parallel universes. Higher node density indicates identical physical constant seeds with timeline branching.
        </p>
      </div>
    </div>
  );
}
