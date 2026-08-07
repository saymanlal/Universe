import { Rng, hashString } from './rng';
import type { Civilization } from './civilization';

export interface Law {
  id: string;
  name: string;
  category: 'taxation' | 'conscription' | 'resource_rights' | 'civil_liberties';
  enactedYear: number;
}

export interface PoliticalSystem {
  civilizationId: string;
  governmentType: string;
  leaderTitle: string;
  currentLeaderName: string;
  stabilityIndex: number; // 0 to 100
  activeLaws: Law[];
  activeConflicts: Array<{
    enemyCivId: string;
    intensity: 'skirmish' | 'border_war' | 'total_war';
    startedYear: number;
  }>;
}

/**
 * Deterministically generates political systems, laws, leaders, and inter-civilization conflict states.
 */
export function generatePoliticalSystem(civ: Civilization, simTimeYears: number): PoliticalSystem {
  const seed = hashString(`${civ.id}_politics`);
  const rng = new Rng(seed);

  const leaderTitles: Record<string, string[]> = {
    tribal_council: ['High Chieftain', 'Elder Speaker', 'Grand Warden'],
    feudal_kingdom: ['King', 'Emperor', 'High Sovereign'],
    republic: ['Chancellor', 'Prime Minister', 'President'],
    empire: ['Imperator', 'Overlord', 'Grand Monarch'],
    technocracy: ['Director General', 'Prime Architect', 'Chief Technocrat'],
  };

  const names = ['Kaelen Sol', 'Valerius Drak', 'Aurelia Thorne', 'Zorion Vance', 'Elysia Solis'];
  const titleList = leaderTitles[civ.polity] ?? ['Leader'];
  const leaderTitle = rng.pick(titleList);
  const currentLeaderName = rng.pick(names);

  const activeLaws: Law[] = [
    {
      id: `law_tax_${civ.id}`,
      name: 'Unified Resource Levy',
      category: 'taxation',
      enactedYear: Math.max(1, Math.floor(simTimeYears * 0.3)),
    },
    {
      id: `law_militia_${civ.id}`,
      name: 'Settlement Defense Mandate',
      category: 'conscription',
      enactedYear: Math.max(1, Math.floor(simTimeYears * 0.6)),
    },
  ];

  return {
    civilizationId: civ.id,
    governmentType: civ.polity,
    leaderTitle,
    currentLeaderName,
    stabilityIndex: rng.int(40, 98),
    activeLaws,
    activeConflicts: [],
  };
}
