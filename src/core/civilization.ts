import { Rng, hashString } from './rng';
import type { SapientSpecies } from './species';

export type SettlementType = 'outpost' | 'village' | 'town' | 'city' | 'metropolis';
export type PolityType = 'tribal_council' | 'feudal_kingdom' | 'republic' | 'empire' | 'technocracy';

export interface Settlement {
  id: string;
  name: string;
  type: SettlementType;
  population: number;
  coordinates: { x: number; y: number };
  infrastructureLevel: number; // 0 to 100
}

export interface Civilization {
  id: string;
  name: string;
  speciesId: string;
  polity: PolityType;
  capitalName: string;
  totalPopulation: number;
  settlements: Settlement[];
  techEra: 'primitive' | 'agrarian' | 'industrial' | 'information' | 'interstellar';
}

/**
 * Deterministically generates civilizations for a planet given its seed, life probability, and sapient species.
 */
export function generateCivilizations(
  planetSeed: number,
  hasSapientLife: boolean,
  species?: SapientSpecies
): Civilization[] {
  if (!hasSapientLife || !species) return [];

  const rng = new Rng(combineSeedWithSalt(planetSeed, 'civ_gen'));
  const civCount = rng.int(1, 3);
  const civs: Civilization[] = [];

  const civPrefixes = ['United', 'Grand', 'High', 'Dominion of', 'Federation of', 'Sovereign'];
  const civSuffixes = ['Realm', 'States', 'Union', 'Enclave', 'Concordat', 'Dynasty'];

  for (let i = 0; i < civCount; i++) {
    const prefix = rng.pick(civPrefixes);
    const suffix = rng.pick(civSuffixes);
    const civName = `${prefix} ${species.name} ${suffix}`;
    const polity: PolityType = rng.pick([
      'tribal_council',
      'feudal_kingdom',
      'republic',
      'empire',
      'technocracy',
    ]);

    const settlementCount = rng.int(2, 6);
    const settlements: Settlement[] = [];
    let totalPop = 0;

    for (let j = 0; j < settlementCount; j++) {
      const isCapital = j === 0;
      const type: SettlementType = isCapital
        ? rng.pick(['city', 'metropolis'])
        : rng.pick(['outpost', 'village', 'town']);

      const basePop =
        type === 'metropolis'
          ? rng.int(500000, 2000000)
          : type === 'city'
          ? rng.int(100000, 500000)
          : type === 'town'
          ? rng.int(10000, 100000)
          : rng.int(500, 10000);

      totalPop += basePop;
      settlements.push({
        id: `settlement_${planetSeed}_${i}_${j}`,
        name: isCapital ? `${species.name} Prime` : `${species.name} Settlement ${j + 1}`,
        type,
        population: basePop,
        coordinates: {
          x: rng.float(-180, 180),
          y: rng.float(-90, 90),
        },
        infrastructureLevel: rng.int(10, 90),
      });
    }

    civs.push({
      id: `civ_${planetSeed}_${i}`,
      name: civName,
      speciesId: species.id,
      polity,
      capitalName: settlements[0].name,
      totalPopulation: totalPop,
      settlements,
      techEra: rng.pick(['primitive', 'agrarian', 'industrial', 'information']),
    });
  }

  return civs;
}

function combineSeedWithSalt(seed: number, salt: string): number {
  return (seed ^ hashString(salt)) >>> 0;
}
