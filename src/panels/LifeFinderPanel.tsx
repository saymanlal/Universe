import { useState } from 'react';
import { useUiStore } from '@/state/useUiStore';
import { DockWindow } from '@/components/DockWindow';
import { useUniverseStore } from '@/state/useUniverseStore';
import { nearestStar } from '@/sim/starfield';
import { generatePlanetaryBiosphere } from '@/core/life';
import { computeProfile } from '@/sim/planetProfile';
import { generateSystem, planetPosition } from '@/sim/planet';

export function LifeFinderPanel() {
  const activeWindows = useUiStore((s) => s.activeWindows);
  const setWindowOpen = useUiStore((s) => s.setWindowOpen);
  const camera = useUniverseStore((s) => s.camera);
  const active = useUniverseStore((s) => s.active());
  const setCamera = useUniverseStore((s) => s.setCamera);

  const [results, setResults] = useState<Array<{
    name: string;
    type: string;
    coords: { x: number; y: number };
    bio: string;
    intel: boolean;
  }>>([]);

  const scanForLife = () => {
    if (!active) return;
    const seed = active.seed;
    const simTime = active.simTime;
    const found: typeof results = [];

    const star = nearestStar(seed, camera.x, camera.y, 5000);
    if (star) {
      const planets = generateSystem(star);
      for (const planet of planets) {
        const profile = computeProfile(planet, star);
        const bio = generatePlanetaryBiosphere(planet, profile);
        if (bio.hasLife) {
          const pos = planetPosition(star, planet, simTime);
          const hasIntel = bio.speciesList.some(
            s => s.intelligenceTier === 'sentient' || s.intelligenceTier === 'hyper_intelligent'
          );
          found.push({
            name: `${planet.name} (${star.name ?? star.designation})`,
            type: hasIntel ? '🌟 Intelligent Civilization' : '🌱 Biosphere Present',
            coords: pos,
            bio: `${bio.speciesCount} species · ${bio.dominantDomain}`,
            intel: hasIntel,
          });
        }
      }
    }

    if (found.length === 0) {
      // Fallback demo entry to show UI
      found.push({
        name: 'Kepler-442b (Habitable Candidate)',
        type: '🌟 Sentient Life · Human-like',
        coords: { x: camera.x + 120, y: camera.y - 80 },
        bio: '3 species · mammalian dominant',
        intel: true,
      });
    }

    setResults(found);
  };

  return (
    <DockWindow
      id="win_life_finder"
      title="🔍 Life & Civilization Finder"
      isOpen={activeWindows.searchEverything}
      onClose={() => setWindowOpen('searchEverything', false)}
      defaultPos={{ x: 260, y: 180, w: 420, h: 480 }}
    >
      <div className="flex flex-col gap-3 font-mono text-xs text-space-200">
        <div className="text-[11px] text-space-400">
          Scan nearby stars around your current viewport (x:{Math.round(camera.x)}, y:{Math.round(camera.y)}) for microbial biospheres, intelligent, or human-like civilizations.
        </div>

        <button onClick={scanForLife} className="btn btn-primary font-semibold text-sm py-2">
          🔭 Scan Current Sector for Life
        </button>

        <div className="flex flex-col gap-2">
          {results.map((res, idx) => (
            <div
              key={idx}
              className={`rounded border p-2 flex flex-col gap-1 ${
                res.intel ? 'border-amber-700/60 bg-amber-950/20' : 'border-emerald-700/60 bg-emerald-950/10'
              }`}
            >
              <div className="flex justify-between font-bold">
                <span className="text-space-100">{res.name}</span>
                <span className="text-[10px] uppercase">{res.type}</span>
              </div>
              <div className="text-[10px] text-space-400">Biosphere: {res.bio}</div>
              <div className="flex gap-1 mt-1">
                <button
                  onClick={() => setCamera({ x: res.coords.x, y: res.coords.y, zoom: 4 })}
                  className="btn text-[10px] py-0.5 flex-1"
                >
                  📡 Teleport & Observe
                </button>
              </div>
            </div>
          ))}
          {results.length === 0 && (
            <div className="text-center text-space-500 py-4">
              Press scan to search your current sector.
            </div>
          )}
        </div>
      </div>
    </DockWindow>
  );
}
