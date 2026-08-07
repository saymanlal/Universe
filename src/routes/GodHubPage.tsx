import { NavLink } from 'react-router-dom';
import { GitBranchIcon, AtomIcon, InfinityIcon, GridIcon } from '@/components/icons';
import { useUniverseStore } from '@/state/useUniverseStore';

export function GodHubPage() {
  const universes = useUniverseStore((s) => s.universes);
  const activeUniverse = useUniverseStore((s) => s.active());

  const views = [
    {
      to: '/god/timeline',
      title: 'Timeline View',
      desc: 'Visualize deterministic universe branching and timeline divergences as SVG lines.',
      icon: <GitBranchIcon width={28} height={28} className="text-accent" />,
    },
    {
      to: '/god/quantum',
      title: 'Quantum Realm',
      desc: 'Inspect Planck-scale zero-point energy, particle-antiparticle pairs, and wave functions.',
      icon: <AtomIcon width={28} height={28} className="text-accent-cyan" />,
    },
    {
      to: '/god/multiverse',
      title: 'Multiverse Map',
      desc: 'Observe all created universes in a 2D force continuum graph.',
      icon: <InfinityIcon width={28} height={28} className="text-amber-400" />,
    },
    {
      to: '/',
      title: 'Canvas Workspace',
      desc: 'Return to the interactive WebGL God-Mode universe canvas.',
      icon: <GridIcon width={28} height={28} className="text-emerald-400" />,
    },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">God Mode Control Hub</h1>
        <p className="text-sm text-space-400 mt-1">Multi-view administration center for universes, timelines, and quantum states</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {views.map((v) => (
          <NavLink
            key={v.to}
            to={v.to}
            className="group relative bg-space-900/60 backdrop-blur border border-space-800 rounded-xl p-6 transition-all hover:border-space-600 hover:bg-space-900"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-space-950 border border-space-800 group-hover:border-space-700">
                {v.icon}
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-white group-hover:text-accent transition-colors">{v.title}</h3>
                <p className="text-xs text-space-400 leading-relaxed">{v.desc}</p>
              </div>
            </div>
          </NavLink>
        ))}
      </div>

      {/* Quick Overview Panel */}
      <div className="bg-space-900/40 border border-space-800 rounded-xl p-6 space-y-3">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Multiverse Quick Telemetry</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div><span className="text-space-500">Total Universes:</span> <span className="text-white font-bold">{universes.length}</span></div>
          <div><span className="text-space-500">Active Universe:</span> <span className="text-accent">{activeUniverse?.name ?? 'None'}</span></div>
          <div><span className="text-space-500">Multiverse Engine:</span> <span className="text-emerald-400">Deterministic</span></div>
          <div><span className="text-space-500">Quantum State:</span> <span className="text-cyan-400">Coherent</span></div>
        </div>
      </div>
    </div>
  );
}
