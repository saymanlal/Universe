import { useState, type FormEvent } from 'react';
import { useUniverseStore } from '@/state/useUniverseStore';
import { formatCompact, simTimeParts } from '@/core/format';
import { Rng, hashString } from '@/core/rng';

export function UniverseInspectorPage() {
  const universes = useUniverseStore((s) => s.universes);
  const activeId = useUniverseStore((s) => s.activeId);
  const setActive = useUniverseStore((s) => s.setActive);

  const activeUniverse = universes.find((u) => u.id === activeId) ?? universes[0];
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ name: string; type: string; distance: string; coords: string }>>([]);

  if (!activeUniverse) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-space-400">
        No active universe loaded. Create or select a universe from the workspace.
      </div>
    );
  }

  const seed = activeUniverse.seed;

  // Derived deterministic cosmological constants
  const expansionRate = (67.4 + (seed % 150) / 10).toFixed(1);
  const hubbleConstant = `${expansionRate} km/s/Mpc`;
  const darkEnergyPct = (68 + (seed % 7)).toFixed(1);
  const matterPct = (100 - parseFloat(darkEnergyPct)).toFixed(1);
  const estimatedGalaxies = formatCompact(500000000000 + (seed % 500000000000));
  const lifeProbFactor = (0.7 + ((seed % 30) / 100)).toFixed(2);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const term = searchQuery.toLowerCase();
    const searchRng = new Rng(hashString(term + seed));
    const types = ['Black Hole', 'White Hole', 'Neutron Star', 'Pulsar', 'Quasar', 'Magnetar'];
    
    const results = Array.from({ length: 6 }, (_, i) => {
      const type = types[i % types.length]!;
      const dist = (searchRng.float(10, 5000)).toFixed(1);
      const x = Math.floor(searchRng.float(-50000, 50000));
      const y = Math.floor(searchRng.float(-50000, 50000));
      return {
        name: `${term.toUpperCase()}-${searchRng.pick(['Alpha', 'Prime', 'X9', 'Vortex', 'Zero'])}-${i + 1}`,
        type,
        distance: `${dist} light years`,
        coords: `(${x}, ${y})`,
      };
    });

    setSearchResults(results);
  };

  const parts = simTimeParts(activeUniverse.simTime);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-space-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Universe Inspector</h1>
          <p className="text-sm text-space-400 mt-1">Deep cosmological parameters & deterministic observation telemetry</p>
        </div>

        {/* Universe Selector */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-space-400 font-medium">Active Universe:</span>
          <select
            value={activeUniverse.id}
            onChange={(e) => setActive(e.target.value)}
            aria-label="Active Universe"
            className="bg-space-900 border border-space-700 text-white rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:border-accent"
          >
            {universes.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of Cosmological Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Overview */}
        <div className="bg-space-900/60 backdrop-blur border border-space-800 rounded-xl p-5 space-y-3">
          <div className="text-xs font-semibold text-accent uppercase tracking-wider">Universe Identity</div>
          <div className="text-2xl font-bold text-white">{activeUniverse.name}</div>
          <div className="space-y-1.5 text-xs text-space-300 font-mono">
            <div className="flex justify-between"><span className="text-space-500">Master Seed:</span> <span>0x{activeUniverse.seed.toString(16)}</span></div>
            <div className="flex justify-between"><span className="text-space-500">Timeline Seed:</span> <span>0x{activeUniverse.timelineSeed.toString(16)}</span></div>
            <div className="flex justify-between"><span className="text-space-500">Sim Time:</span> <span>Y{parts.years} · D{parts.days}</span></div>
          </div>
        </div>

        {/* Card 2: Expansion & Physics */}
        <div className="bg-space-900/60 backdrop-blur border border-space-800 rounded-xl p-5 space-y-3">
          <div className="text-xs font-semibold text-accent-cyan uppercase tracking-wider">Cosmology & Expansion</div>
          <div className="text-2xl font-bold text-white">{hubbleConstant}</div>
          <div className="space-y-1.5 text-xs text-space-300 font-mono">
            <div className="flex justify-between"><span className="text-space-500">Dark Energy:</span> <span>{darkEnergyPct}%</span></div>
            <div className="flex justify-between"><span className="text-space-500">Matter Density:</span> <span>{matterPct}%</span></div>
            <div className="flex justify-between"><span className="text-space-500">Expansion Model:</span> <span>Accelerating Metric</span></div>
          </div>
        </div>

        {/* Card 3: Galaxies & Life */}
        <div className="bg-space-900/60 backdrop-blur border border-space-800 rounded-xl p-5 space-y-3">
          <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Structures & Habitability</div>
          <div className="text-2xl font-bold text-white">{estimatedGalaxies} <span className="text-xs font-normal text-space-400">galaxies</span></div>
          <div className="space-y-1.5 text-xs text-space-300 font-mono">
            <div className="flex justify-between"><span className="text-space-500">Life Probability:</span> <span className="text-emerald-400 font-bold">{lifeProbFactor}</span></div>
            <div className="flex justify-between"><span className="text-space-500">Gravitational Pull:</span> <span>Stable Rotation</span></div>
            <div className="flex justify-between"><span className="text-space-500">Cluster Density:</span> <span>Normal Superclusters</span></div>
          </div>
        </div>
      </div>

      {/* Object Finder Search Bar */}
      <div className="bg-space-900/40 border border-space-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Cosmic Object Finder</h2>
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for black holes, white holes, pulsars, neutron stars..."
            className="flex-1 bg-space-950 border border-space-700 rounded-lg px-4 py-2 text-sm text-white outline-none focus:border-accent"
          />
          <button type="submit" className="bg-accent hover:bg-accent/80 text-white font-medium px-5 py-2 rounded-lg text-sm transition">
            Scan Sector
          </button>
        </form>

        {searchResults.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4">
            {searchResults.map((res, i) => (
              <div key={i} className="bg-space-950/80 border border-space-800 p-4 rounded-lg space-y-1">
                <div className="font-semibold text-accent text-sm">{res.name}</div>
                <div className="text-xs text-space-400">{res.type} · {res.distance}</div>
                <div className="text-[11px] font-mono text-space-500">Coords: {res.coords}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
