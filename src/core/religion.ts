import { Rng, hashString } from './rng';
import type { Civilization } from './civilization';

export type PantheonType = 'monotheism' | 'polytheism' | 'animism' | 'cosmic_rationalism';

export interface CulturalTradition {
  name: string;
  significance: string;
}

export interface ReligionAndCulture {
  civilizationId: string;
  pantheonName: string;
  pantheonType: PantheonType;
  devotionPercentage: number; // 0 to 100
  coreBeliefs: string[];
  traditions: CulturalTradition[];
}

/**
 * Deterministically generates religion, spiritual belief systems, and cultural traditions.
 */
export function generateReligionAndCulture(civ: Civilization): ReligionAndCulture {
  const seed = hashString(`${civ.id}_religion`);
  const rng = new Rng(seed);

  const pantheonTypes: PantheonType[] = ['monotheism', 'polytheism', 'animism', 'cosmic_rationalism'];
  const pantheonType = rng.pick(pantheonTypes);

  const prefixes = ['Order of the', 'Faith of', 'Path of the', 'Cult of the', 'Fellowship of'];
  const nouns = ['Stellar Core', 'Primordial Tide', 'Eternal Flame', 'Singularity', 'Ancestral Spirit'];

  const pantheonName = `${rng.pick(prefixes)} ${rng.pick(nouns)}`;

  const coreBeliefsPool = [
    'The Universe is a deterministic simulation created by an Observing Divinity.',
    'All matter seeks cosmic equilibrium through cyclical rebirth.',
    'Stars are living consciousnesses guiding civilized destinies.',
    'Technological advancement brings mortals closer to divinity.',
  ];

  const coreBeliefsCount = rng.int(1, 2);
  const coreBeliefs: string[] = [];
  for (let i = 0; i < coreBeliefsCount; i++) {
    const b = rng.pick(coreBeliefsPool);
    if (!coreBeliefs.includes(b)) coreBeliefs.push(b);
  }

  const traditions: CulturalTradition[] = [
    {
      name: 'Starlight Equinox Feast',
      significance: 'Annual gathering celebrating solar alignment and harvest.',
    },
    {
      name: 'Chronos Vigil',
      significance: 'Silent meditation honoring past ages and historical record.',
    },
  ];

  return {
    civilizationId: civ.id,
    pantheonName,
    pantheonType,
    devotionPercentage: rng.int(35, 95),
    coreBeliefs,
    traditions,
  };
}
