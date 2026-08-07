import { Rng, hashString } from './rng';
import type { Planet } from '@/sim/planet';
import type { PlanetProfile } from '@/sim/planetProfile';
import type { PlanetaryBiosphere } from './life';

export interface EvolutionaryState {
  generationCount: number;
  mutationRate: number; // 0 to 1
  selectionPressure: number; // 0 to 1
  adaptationIndex: number; // 0 to 1
  extinctionRisk: number; // 0 to 1
  evolutionaryStage: 'abiogenesis' | 'microbial_dominance' | 'multicellular_radiation' | 'complex_ecosystems' | 'sentience_threshold';
  activeAdaptations: string[];
}

const ADAPTATION_POOL = [
  'Thermal Shock Tolerance',
  'Radiotrophic Melanin Synthesis',
  'Deep-Sea Barophilia',
  'Endosymbiotic Nitrogen Fixation',
  'Complex Neural Ganglia',
  'Chitinous Exoskeleton Armor',
  'Bioluminescent Communication',
  'Anaerobic Respiration Bypass',
];

export function computeEvolutionaryState(
  planet: Planet,
  profile: PlanetProfile,
  biosphere: PlanetaryBiosphere,
  simTimeSeconds: number = 0
): EvolutionaryState {
  if (!biosphere.hasLife) {
    return {
      generationCount: 0,
      mutationRate: 0,
      selectionPressure: 0,
      adaptationIndex: 0,
      extinctionRisk: 0,
      evolutionaryStage: 'abiogenesis',
      activeAdaptations: [],
    };
  }

  const seed = hashString(planet.id);
  const rng = new Rng(seed ^ 0x45564f4c); // 'EVOL'

  // Time in millions of sim years
  const simYearsMillions = simTimeSeconds / (31557600 * 1e6);
  const generationCount = Math.floor((1000 + simYearsMillions * 50000) * (biosphere.speciesCount / 5));

  // Environmental stress drives mutation and selection pressure
  const tempStress = Math.abs(profile.surfaceTemp - 288) / 100;
  const pressStress = Math.abs(profile.atmosphere.pressure - 1);
  const environmentalStress = Math.min(1, (tempStress + pressStress) * 0.4);

  const mutationRate = Number((0.05 + environmentalStress * 0.25 + rng.float(0, 0.05)).toFixed(3));
  const selectionPressure = Number((0.2 + environmentalStress * 0.5 + (1 - profile.habitability) * 0.3).toFixed(2));
  const adaptationIndex = Number(Math.min(1, 0.1 + (1 - selectionPressure * 0.4) * 0.5 + Math.min(0.4, simYearsMillions * 0.1)).toFixed(2));
  const extinctionRisk = Number(Math.max(0, selectionPressure - adaptationIndex * 0.8).toFixed(2));

  let evolutionaryStage: EvolutionaryState['evolutionaryStage'] = 'microbial_dominance';
  if (profile.lifeProbability > 0.7 && adaptationIndex > 0.75) {
    evolutionaryStage = 'sentience_threshold';
  } else if (profile.lifeProbability > 0.45 && adaptationIndex > 0.5) {
    evolutionaryStage = 'complex_ecosystems';
  } else if (profile.lifeProbability > 0.2) {
    evolutionaryStage = 'multicellular_radiation';
  }

  // Active adaptations derived deterministically
  const activeAdaptations: string[] = [];
  const adaptationCount = Math.min(ADAPTATION_POOL.length, Math.floor(adaptationIndex * 5) + 1);
  for (let i = 0; i < adaptationCount; i++) {
    activeAdaptations.push(ADAPTATION_POOL[i % ADAPTATION_POOL.length]!);
  }

  return {
    generationCount,
    mutationRate,
    selectionPressure,
    adaptationIndex,
    extinctionRisk,
    evolutionaryStage,
    activeAdaptations,
  };
}
