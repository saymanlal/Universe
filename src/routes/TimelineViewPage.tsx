import { useState } from 'react';
import { useUniverseStore } from '@/state/useUniverseStore';
import { formatCompact, simTimeParts } from '@/core/format';

export function TimelineViewPage() {
  const universes = useUniverseStore((s) => s.universes);
  const activeId = useUniverseStore((s) => s.activeId);
  const setActive = useUniverseStore((s) => s.setActive);

  const activeUniverse = universes.find((u) => u.id === activeId) ?? universes[0];

  // Group universes by master seed to identify timeline branches
  const cosmosGroups = Array.from(new Set(universes.map((u) => u.seed)));
  const [selectedSeed, setSelectedSeed] = useState<number>(cosmosGroups[0] ?? 0);

  const groupUniverses = universes.filter((u) => u.seed === selectedSeed);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between border-b border-space-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Timeline Branch Explorer</h1>
          <p className="text-sm text-space-400 mt-1">Interactive timeline tree showing branches, divergence points, and sim time states</p>
        </div>

        {/* Group Selector */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-space-400 font-medium">Cosmos Seed:</span>
          <select
            value={selectedSeed}
            onChange={(e) => setSelectedSeed(Number(e.target.value))}
            aria-label="Cosmos Seed"
            className="bg-space-900 border border-space-700 text-white rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:border-accent"
          >
            {cosmosGroups.map((seed) => (
              <option key={seed} value={seed}>
                Seed 0x{seed.toString(16)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* SVG Animated Timeline Tree */}
      <div className="bg-space-900/60 backdrop-blur border border-space-800 rounded-xl p-6 relative overflow-x-auto min-h-[360px] flex flex-col justify-center items-center">
        <svg className="w-full h-64" viewBox="0 0 800 200">
          {/* Main timeline trunk */}
          <line x1="50" y1="100" x2="750" y2="100" stroke="#3b82f6" strokeWidth="4" strokeDasharray="5 5" className="animate-pulse" />

          {/* Render Timeline Nodes */}
          {groupUniverses.map((u, i) => {
            const x = 100 + i * 180;
            const y = i % 2 === 0 ? 100 : 50;
            const isActive = u.id === activeId;

            return (
              <g key={u.id} className="cursor-pointer" onClick={() => setActive(u.id)}>
                {/* Branching line */}
                {i > 0 && <line x1={x - 180} y1="100" x2={x} y2={y} stroke="#8b5cf6" strokeWidth="2" />}
                
                {/* Node Circle */}
                <circle
                  cx={x}
                  cy={y}
                  r={isActive ? 12 : 8}
                  className={`${isActive ? 'fill-accent stroke-white stroke-2' : 'fill-space-700 hover:fill-accent-cyan'} transition-all`}
                />
                
                {/* Text Label */}
                <text x={x} y={y + 25} textAnchor="middle" fill="#94a3b8" fontSize="12" className="font-mono">
                  {u.name}
                </text>
                <text x={x} y={y + 40} textAnchor="middle" fill="#64748b" fontSize="10" className="font-mono">
                  Y{simTimeParts(u.simTime).years}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="text-xs text-space-400 mt-4">
          Click any timeline node to switch active inspection state.
        </div>
      </div>

      {/* Selected Timeline Card */}
      {activeUniverse && (
        <div className="bg-space-900/40 border border-space-800 rounded-xl p-6 space-y-3">
          <h3 className="text-lg font-semibold text-white">Active Timeline: {activeUniverse.name}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
            <div><span className="text-space-500">Sim Time:</span> <span className="text-white">{formatCompact(activeUniverse.simTime)}s</span></div>
            <div><span className="text-space-500">Timeline Seed:</span> <span className="text-accent">0x{activeUniverse.timelineSeed.toString(16)}</span></div>
            <div><span className="text-space-500">Created:</span> <span className="text-space-300">{new Date(activeUniverse.createdAt).toLocaleDateString()}</span></div>
            <div><span className="text-space-500">Divergence:</span> <span className="text-emerald-400">Branch Active</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
