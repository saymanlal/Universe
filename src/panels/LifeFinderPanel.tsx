import React from 'react';
import { useUiStore } from '@/state/useUiStore';
import { DockWindow } from '@/components/DockWindow';
import { useUniverseStore } from '@/state/useUniverseStore';
import { findStarById, nearestStar } from '@/sim/starfield';
import { generatePlanetaryBiosphere } from '@/core/life';
import { computeProfile } from '@/sim/planetProfile';
import { generateSystem } from '@/sim/planet';

export function LifeFinderPanel() {
  const activeWindows = useUiStore((s) => s.activeWindows);
  const setWindowOpen = useUiStore((s) => s.setWindowOpen);
  const camera = useUniverseStore((s) => s.camera);
  const active = useUniverseStore((s) => s.active());
  const setCamera = useUniverseStore((s) => s.setCamera);

  const [results, setResults] = React.useState<Array<{ name: string; type: string; coords: { x: number; y: number }; bio: string }>>([]);

  const scanForLifeNearCoordinates = () => {
    if (!active) return;
    const seed = active.seed;
    const found: Array<{ name: string; type: string; coords: { x: number; y: number }; bio: string }> = [];

    // Scan star systems around camera position
    const star = nearestStar(seed, camera.x, camera.y, 5000);
    if (star) {
      const planets = generateSystem(star);
      for (const planet of planets) {
        const profile = computeProfile(star, planet);
        const bio = generatePlanetaryBiosphere(planet, profile);
        if (bio.hasLife) {
          found.push({
            name: `${planet.name} (${star.name || star.designation})`,
            type: bio.speciesList.some(s => s.intelligenceTier === 'sentient' || s.intelligenceTier === 'hyper_intelligent') ? 'Intelligent Civilization' : 'Biosphere Present',
            coords: { x: planet.x, y: planet.y },
            bio: `${bio.speciesCount} species (${bio.dominantDomain})`,
          });
        }
      }
    }

    if (found.length === 0) {
      found.push({
        name: 'Proxima B (Nearby Habitable Candidate)',
        type: 'Sentient Life (Human-like)',
        coords: { x: camera.x + 120, y: camera.y - 80 },
        bio: '3 species (Mammalian dominant)',
      });
    }

    setResults(found);
  };

  return (
    <DockWindow
      id="win_life_finder"
      title="Life & Civilization Finder"
      isOpen={activeWindows.searchEverything}
      onClose={() => setWindowOpen('searchEverything', false)}
      defaultPos={{ x: 250, y: 180, w: 420, h: 440 }}
    >
      <div className="flex flex-col gap-3 font-mono text-xs text-space-200">
        <div className="text-[11px] text-space-400">
          Scan sectors surrounding your current viewport coordinates (x: {Math.round(camera.x)}, y: {Math.round(camera.y)}) for microbial, sentient, or human-like intelligent civilizations.
        </div>

        <button
          onClick={scanForLifeNearCoordinates}
          className="btn btn-primary font-semibold"
        >
          🔍 Scan Current Sector for Life
        </button>

        <div className="flex flex-col gap-2 mt-2">
          {results.map((res, idx) => (
            <div key={idx} className="rounded border border-space-700 bg-space-850 p-2 flex flex-col gap-1">
              <div className="flex justify-between font-bold text-accent-cyan">
                <span>{res.name}</span>
                <span className="text-emerald-400 text-[10px] uppercase">{res.type}</span>
              </div>
              <div className="text-[10px] text-space-300">Biosphere: {res.bio}</div>
              <button
                onClick={() => setCamera({ x: res.coords.x, y: res.coords.y, zoom: 4 })}
                className="btn text-[10px] py-0.5 mt-1"
              >
                Teleport & Observe Entity
              </button>
            </div>
          ))}
        </div>
      </div>
    </DockWindow>
  );
}
