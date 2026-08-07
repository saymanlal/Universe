import { Rng, hashString } from './rng';
import type { Planet } from '@/sim/planet';
import type { PlanetProfile } from '@/sim/planetProfile';
import type { EvolutionaryState } from './evolution';

export interface SapientSpecies {
  id: string;
  name: string;
  dnaSequence: string; // 64-char hex genetic marker
  cognitionIQ: number; // 50 to 250
  physicalForm: 'bipedal' | 'quadrupedal' | 'serpentine' | 'amorphous' | 'avian' | 'aquatic_cephalopod';
  traits: string[];
  languageFamily: {
    name: string;
    syntaxType: 'Subject-Verb-Object' | 'Subject-Object-Verb' | 'Tonal-Glyphic' | 'Pheromonal-Acoustic';
    phonemesCount: number;
  };
  aggressionIndex: number; // 0 to 1
  curiosityIndex: number; // 0 to 1
}

const TRAIT_POOL = [
  'Bioluminescent Signalling',
  'Echolocative Perception',
  'Telepathic Resonance',
  'Regenerative Tissue',
  'Thermal Insulation Layer',
  'Exoskeletal Plating',
  'Enhanced Spatial Memory',
  'Sub-vocal Resonance',
];

const NAME_PREFIXES = ['Aethel', 'Zyr', 'Kael', 'Xil', 'Vael', 'Sol', 'Drak', 'Nyx'];
const NAME_SUFFIXES = ['ian', 'ite', 'ari', 'on', 'um', 'ix', 'ora', 'eth'];

export function generateSapientSpecies(
  planet: Planet,
  profile: PlanetProfile,
  evolState: EvolutionaryState
): SapientSpecies | null {
  if (evolState.evolutionaryStage !== 'sentience_threshold' && profile.lifeProbability < 0.6) {
    return null;
  }

  const seed = hashString(planet.id);
  const rng = new Rng(seed ^ 0x53415049); // 'SAPI'

  const speciesName = `${rng.pick(NAME_PREFIXES)}${rng.pick(NAME_SUFFIXES)}`;

  // Generate 64-character DNA hex sequence
  let dnaSequence = '';
  for (let i = 0; i < 16; i++) {
    dnaSequence += Math.floor(rng.float(0, 0xffff)).toString(16).padStart(4, '0');
  }

  const physicalForms: SapientSpecies['physicalForm'][] = [
    'bipedal',
    'quadrupedal',
    'serpentine',
    'amorphous',
    'avian',
    'aquatic_cephalopod',
  ];

  const syntaxTypes: SapientSpecies['languageFamily']['syntaxType'][] = [
    'Subject-Verb-Object',
    'Subject-Object-Verb',
    'Tonal-Glyphic',
    'Pheromonal-Acoustic',
  ];

  const traits: string[] = [];
  for (let i = 0; i < 3; i++) {
    const t = rng.pick(TRAIT_POOL);
    if (!traits.includes(t)) traits.push(t);
  }

  return {
    id: `sap-${planet.id}`,
    name: speciesName,
    dnaSequence,
    cognitionIQ: Math.round(rng.float(85, 180) + profile.habitability * 40),
    physicalForm: rng.pick(physicalForms),
    traits,
    languageFamily: {
      name: `${speciesName}-Nihon`,
      syntaxType: rng.pick(syntaxTypes),
      phonemesCount: Math.round(rng.float(14, 72)),
    },
    aggressionIndex: Number(rng.float(0.1, 0.85).toFixed(2)),
    curiosityIndex: Number(rng.float(0.4, 0.98).toFixed(2)),
  };
}
