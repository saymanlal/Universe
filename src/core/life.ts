import { Rng, hashString } from './rng';
import type { Planet } from '@/sim/planet';
import type { PlanetProfile } from '@/sim/planetProfile';

export type LifeDomain = 'microbe' | 'plant' | 'animal';

export interface Species {
  id: string;
  name: string;
  domain: LifeDomain;
  complexity: number; // 0 to 1
  biomassFraction: number; // 0 to 1
  trophicRole: 'producer' | 'consumer' | 'decomposer' | 'apex_predator';
  respirationGas: string;
  color: string;
  description: string;
}

export interface PlanetaryBiosphere {
  hasLife: boolean;
  totalBiomassIndex: number; // 0 to 100
  dominantDomain: LifeDomain | 'none';
  speciesCount: number;
  speciesList: Species[];
}

const MICROBE_PREFIXES = ['Pyro', 'Halo', 'Methano', 'Acid', 'Thermo', 'Radio', 'Chemo'];
const MICROBE_SUFFIXES = ['coccus', 'bacterium', 'monas', 'spirillum', 'archaea'];

const PLANT_PREFIXES = ['Chlor', 'Phyc', 'Xanth', 'Lichen', 'Dendro', 'Bryo', 'Myco'];
const PLANT_SUFFIXES = ['phyte', 'flora', 'spora', 'canopy', 'root', 'folia'];

const ANIMAL_PREFIXES = ['Velo', 'Xeno', 'Arthro', 'Bio', 'Stratos', 'Thalasso', 'Terra'];
const ANIMAL_SUFFIXES = ['pod', 'vore', 'beast', 'form', 'morph', 'wing', 'dermis'];

export function generatePlanetaryBiosphere(planet: Planet, profile: PlanetProfile): PlanetaryBiosphere {
  if (profile.lifeProbability < 0.05) {
    return {
      hasLife: false,
      totalBiomassIndex: 0,
      dominantDomain: 'none',
      speciesCount: 0,
      speciesList: [],
    };
  }

  const seed = hashString(planet.id);
  const rng = new Rng(seed ^ 0x4c494645); // 'LIFE'

  const speciesList: Species[] = [];
  const speciesCount = Math.floor(rng.float(3, 12) * profile.habitability * 3);

  // Microbes (always present if life exists)
  const microbeName = `${rng.pick(MICROBE_PREFIXES)}${rng.pick(MICROBE_SUFFIXES)}`;
  speciesList.push({
    id: `sp-mic-${planet.id}`,
    name: microbeName,
    domain: 'microbe',
    complexity: Number(rng.float(0.05, 0.25).toFixed(2)),
    biomassFraction: Number(rng.float(0.4, 0.8).toFixed(2)),
    trophicRole: 'decomposer',
    respirationGas: profile.atmosphere.components[0]?.gas ?? 'CO₂',
    color: '#4ade80',
    description: 'Extremophilic microbial colony driving biogeochemical cycles.',
  });

  // Plants / Producers (if sufficient light/water)
  if (profile.lifeProbability > 0.15) {
    const plantName = `${rng.pick(PLANT_PREFIXES)}${rng.pick(PLANT_SUFFIXES)}`;
    speciesList.push({
      id: `sp-plt-${planet.id}`,
      name: plantName,
      domain: 'plant',
      complexity: Number(rng.float(0.3, 0.65).toFixed(2)),
      biomassFraction: Number(rng.float(0.2, 0.5).toFixed(2)),
      trophicRole: 'producer',
      respirationGas: 'CO₂',
      color: profile.surfaceTemp > 300 ? '#f59e0b' : '#10b981',
      description: 'Photosynthetic autotroph forming canopy & surface biome.',
    });
  }

  // Animals / Fauna (if advanced habitability)
  if (profile.lifeProbability > 0.35) {
    const animalName = `${rng.pick(ANIMAL_PREFIXES)}${rng.pick(ANIMAL_SUFFIXES)}`;
    speciesList.push({
      id: `sp-anm-${planet.id}`,
      name: animalName,
      domain: 'animal',
      complexity: Number(rng.float(0.6, 0.95).toFixed(2)),
      biomassFraction: Number(rng.float(0.05, 0.2).toFixed(2)),
      trophicRole: profile.lifeProbability > 0.6 ? 'apex_predator' : 'consumer',
      respirationGas: 'O₂',
      color: '#a855f7',
      description: 'Multicellular organism with specialized neural & sensory organs.',
    });
  }

  const totalBiomassIndex = Math.round(profile.lifeProbability * 100 * rng.float(0.8, 1.3));
  const dominantDomain: LifeDomain = speciesList.some((s) => s.domain === 'animal')
    ? 'animal'
    : speciesList.some((s) => s.domain === 'plant')
    ? 'plant'
    : 'microbe';

  return {
    hasLife: true,
    totalBiomassIndex,
    dominantDomain,
    speciesCount,
    speciesList,
  };
}
