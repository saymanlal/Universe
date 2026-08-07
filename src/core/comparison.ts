import type { Universe } from './types';
import { generateStatistics } from './statistics';

export interface UniverseComparisonReport {
  universeA: { id: string; name: string; simTime: number; population: number; ggp: number };
  universeB: { id: string; name: string; simTime: number; population: number; ggp: number };
  populationDelta: number;
  ggpDelta: number;
  timeDeltaSeconds: number;
  identicalCosmosSeed: boolean;
}

/**
 * Compares two universes or timeline branches to analyze divergence metrics.
 */
export function compareUniverses(uA: Universe, uB: Universe): UniverseComparisonReport {
  const statsA = generateStatistics(uA);
  const statsB = generateStatistics(uB);

  return {
    universeA: {
      id: uA.id,
      name: uA.name,
      simTime: uA.simTime,
      population: statsA.totalPopulation,
      ggp: statsA.grossGalacticProduct,
    },
    universeB: {
      id: uB.id,
      name: uB.name,
      simTime: uB.simTime,
      population: statsB.totalPopulation,
      ggp: statsB.grossGalacticProduct,
    },
    populationDelta: statsB.totalPopulation - statsA.totalPopulation,
    ggpDelta: statsB.grossGalacticProduct - statsA.grossGalacticProduct,
    timeDeltaSeconds: uB.simTime - uA.simTime,
    identicalCosmosSeed: uA.seed === uB.seed,
  };
}
