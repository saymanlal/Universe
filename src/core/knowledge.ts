import { Rng, hashString } from './rng';
import type { Civilization } from './civilization';

export type KnowledgeCategory = 'astronomy' | 'metallurgy' | 'medicine' | 'agriculture' | 'architecture' | 'quantum_mechanics';

export interface Discovery {
  id: string;
  title: string;
  category: KnowledgeCategory;
  discoveredYear: number;
  impactScore: number; // 1 to 100
  summary: string;
}

export interface KnowledgeSystem {
  civilizationId: string;
  knownDiscoveries: Discovery[];
  activeResearchTopic: string;
  learningRate: number; // 0.1 to 2.0 multiplier based on species IQ
}

/**
 * Deterministically generates knowledge progression, discoveries, and ideas for a civilization.
 */
export function generateKnowledgeSystem(
  civ: Civilization,
  cognitionIQ: number,
  simTimeYears: number
): KnowledgeSystem {
  const seed = hashString(`${civ.id}_knowledge`);
  const rng = new Rng(seed);

  const possibleDiscoveries: Discovery[] = [
    {
      id: 'disc_celestial_navigation',
      title: 'Celestial Triangulation',
      category: 'astronomy',
      discoveredYear: Math.max(1, Math.floor(simTimeYears * 0.2)),
      impactScore: 45,
      summary: 'Mapping stellar patterns to guide maritime and land trade routes.',
    },
    {
      id: 'disc_smelting',
      title: 'High-Heat Ore Reduction',
      category: 'metallurgy',
      discoveredYear: Math.max(1, Math.floor(simTimeYears * 0.4)),
      impactScore: 65,
      summary: 'Extracting high-purity metallic compounds for tools and structures.',
    },
    {
      id: 'disc_herbal_synthesis',
      title: 'Antiseptic Extraction',
      category: 'medicine',
      discoveredYear: Math.max(1, Math.floor(simTimeYears * 0.5)),
      impactScore: 55,
      summary: 'Utilizing botanical compounds to treat cellular infections.',
    },
    {
      id: 'disc_crop_rotation',
      title: 'Nitrogen Crop Rotation',
      category: 'agriculture',
      discoveredYear: Math.max(1, Math.floor(simTimeYears * 0.1)),
      impactScore: 70,
      summary: 'Systematic land resting to maximize agricultural yields.',
    },
  ];

  const knownCount = rng.int(1, possibleDiscoveries.length);
  const knownDiscoveries = possibleDiscoveries.slice(0, knownCount);

  const learningRate = Math.round((cognitionIQ / 100) * 100) / 100;
  const researchTopics = [
    'Sub-atomic Particle Isolation',
    'Atmospheric Thermal Conversion',
    'Gravitational Wave Transceivers',
    'Synthetic Genetic Polymerization',
  ];

  return {
    civilizationId: civ.id,
    knownDiscoveries,
    activeResearchTopic: rng.pick(researchTopics),
    learningRate,
  };
}
