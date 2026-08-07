import type { Universe } from './types';
import { Rng, hashString } from './rng';

export interface DemographicMetrics {
  universeId: string;
  totalPopulation: number;
  grossGalacticProduct: number; // in mega-credits
  birthsPerCentury: number;
  deathsPerCentury: number;
  activeConflictsCount: number;
  historicalTrend: Array<{
    year: number;
    population: number;
    ggp: number;
  }>;
}

/**
 * Deterministically computes statistical demographic charts and macroscopic metrics.
 */
export function generateStatistics(universe: Universe): DemographicMetrics {
  const seed = hashString(`${universe.id}_stats`);
  const rng = new Rng(seed);

  const totalPopulation = rng.int(50_000_000, 800_000_000_000);
  const grossGalacticProduct = Math.round(totalPopulation * rng.float(0.8, 3.2));
  const birthsPerCentury = Math.round(totalPopulation * 0.08);
  const deathsPerCentury = Math.round(totalPopulation * 0.075);
  const activeConflictsCount = rng.int(0, 12);

  const historicalTrend: Array<{ year: number; population: number; ggp: number }> = [];
  const currentYear = Math.max(10, Math.floor(universe.simTime / 31557600));

  for (let i = 0; i <= 5; i++) {
    const yr = Math.floor((currentYear * i) / 5);
    const popRatio = (i + 1) / 6;
    historicalTrend.push({
      year: yr,
      population: Math.round(totalPopulation * popRatio),
      ggp: Math.round(grossGalacticProduct * popRatio),
    });
  }

  return {
    universeId: universe.id,
    totalPopulation,
    grossGalacticProduct,
    birthsPerCentury,
    deathsPerCentury,
    activeConflictsCount,
    historicalTrend,
  };
}
