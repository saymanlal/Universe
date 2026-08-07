import { Rng, hashString } from './rng';
import type { Civilization } from './civilization';

export type TechEra = 'stone_age' | 'bronze_age' | 'iron_age' | 'industrial' | 'digital' | 'space_age';

export interface TechNode {
  id: string;
  name: string;
  era: TechEra;
  unlocked: boolean;
  prerequisites: string[];
}

export interface TechnologyTree {
  civilizationId: string;
  currentEra: TechEra;
  unlockedNodes: TechNode[];
  researchProgressPercentage: number; // 0 to 100
}

/**
 * Deterministically generates technology tree progression across stone, bronze, iron, industrial, digital, and space ages.
 */
export function generateTechTree(civ: Civilization): TechnologyTree {
  const seed = hashString(`${civ.id}_tech`);
  const rng = new Rng(seed);

  const eraMap: Record<string, TechEra> = {
    primitive: 'stone_age',
    agrarian: 'bronze_age',
    industrial: 'industrial',
    information: 'digital',
    interstellar: 'space_age',
  };

  const currentEra = eraMap[civ.techEra] ?? 'bronze_age';

  const nodes: TechNode[] = [
    { id: 'tech_fire', name: 'Pyrotechnic Mastery', era: 'stone_age', unlocked: true, prerequisites: [] },
    { id: 'tech_wheel', name: 'Rotational Mobility', era: 'bronze_age', unlocked: currentEra !== 'stone_age', prerequisites: ['tech_fire'] },
    { id: 'tech_metallurgy', name: 'Iron Smelting', era: 'iron_age', unlocked: ['industrial', 'digital', 'space_age'].includes(currentEra), prerequisites: ['tech_wheel'] },
    { id: 'tech_steam', name: 'Thermodynamic Expansion', era: 'industrial', unlocked: ['digital', 'space_age'].includes(currentEra), prerequisites: ['tech_metallurgy'] },
    { id: 'tech_silicon', name: 'Semiconductor Logic', era: 'digital', unlocked: currentEra === 'space_age', prerequisites: ['tech_steam'] },
    { id: 'tech_warp', name: 'Sub-space Vectoring', era: 'space_age', unlocked: false, prerequisites: ['tech_silicon'] },
  ];

  return {
    civilizationId: civ.id,
    currentEra,
    unlockedNodes: nodes.filter((n) => n.unlocked),
    researchProgressPercentage: rng.int(15, 85),
  };
}
