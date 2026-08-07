import { Rng, hashString } from './rng';
import type { Planet } from '@/sim/planet';
import type { PlanetProfile } from '@/sim/planetProfile';

export interface ChemicalElement {
  symbol: string;
  name: string;
  atomicNumber: number;
  category: 'gas' | 'nonmetal' | 'metal' | 'noble' | 'radioactive';
  abundance: number; // 0 to 1
  color: string;
}

export interface ChemicalCompound {
  formula: string;
  name: string;
  state: 'solid' | 'liquid' | 'gas';
  fraction: number; // 0 to 1
  description: string;
}

export interface ChemicalReaction {
  id: string;
  reactants: string[];
  products: string[];
  rate: number; // 0 to 1
  energyDelta: 'exothermic' | 'endothermic' | 'neutral';
  name: string;
}

const PRIMARY_ELEMENTS: Omit<ChemicalElement, 'abundance'>[] = [
  { symbol: 'H', name: 'Hydrogen', atomicNumber: 1, category: 'gas', color: '#e0e7ff' },
  { symbol: 'He', name: 'Helium', atomicNumber: 2, category: 'noble', color: '#fef3c7' },
  { symbol: 'C', name: 'Carbon', atomicNumber: 6, category: 'nonmetal', color: '#6b7280' },
  { symbol: 'N', name: 'Nitrogen', atomicNumber: 7, category: 'gas', color: '#93c5fd' },
  { symbol: 'O', name: 'Oxygen', atomicNumber: 8, category: 'gas', color: '#60a5fa' },
  { symbol: 'Si', name: 'Silicon', atomicNumber: 14, category: 'nonmetal', color: '#fcd34d' },
  { symbol: 'Fe', name: 'Iron', atomicNumber: 26, category: 'metal', color: '#f87171' },
  { symbol: 'Mg', name: 'Magnesium', atomicNumber: 12, category: 'metal', color: '#a7f3d0' },
  { symbol: 'S', name: 'Sulfur', atomicNumber: 16, category: 'nonmetal', color: '#facc15' },
  { symbol: 'Na', name: 'Sodium', atomicNumber: 11, category: 'metal', color: '#fb923c' },
  { symbol: 'U', name: 'Uranium', atomicNumber: 92, category: 'radioactive', color: '#4ade80' },
];

export function generatePlanetaryChemistry(planet: Planet, profile: PlanetProfile): {
  elements: ChemicalElement[];
  compounds: ChemicalCompound[];
  reactions: ChemicalReaction[];
} {
  const seed = hashString(planet.id);
  const rng = new Rng(seed ^ 0x4348454d); // 'CHEM'

  // Generate element abundances based on planet composition & resources
  let totalAbundance = 0;
  const rawElements = PRIMARY_ELEMENTS.map((el) => {
    let weight = rng.float(0.1, 1.0);
    if (el.symbol === 'H' || el.symbol === 'He') weight *= (profile.atmosphere.pressure + 0.1) * 2;
    if (el.symbol === 'Fe' || el.symbol === 'Si') weight *= profile.earthMasses * 1.5;
    if (el.symbol === 'O' || el.symbol === 'H') weight *= profile.waterCoverage > 0.2 ? 2.5 : 0.8;
    if (el.symbol === 'U') weight *= 0.05;
    totalAbundance += weight;
    return { ...el, weight };
  });

  const elements: ChemicalElement[] = rawElements.map((el) => ({
    symbol: el.symbol,
    name: el.name,
    atomicNumber: el.atomicNumber,
    category: el.category,
    abundance: Number((el.weight / totalAbundance).toFixed(4)),
    color: el.color,
  })).sort((a, b) => b.abundance - a.abundance);

  // Derive compounds from planet conditions
  const compounds: ChemicalCompound[] = [];
  const tempK = profile.surfaceTemp;

  // Water / Ice / Vapor
  const h2oState = tempK < 273 ? 'solid' : tempK > 373 ? 'gas' : 'liquid';
  if (profile.waterCoverage > 0.05) {
    compounds.push({
      formula: 'H₂O',
      name: tempK < 273 ? 'Water Ice' : tempK > 373 ? 'Water Vapor' : 'Liquid Water',
      state: h2oState,
      fraction: Number((profile.waterCoverage * 0.6).toFixed(3)),
      description: 'Essential solvent for organic synthesis.',
    });
  }

  // Silicates / Core minerals
  compounds.push({
    formula: 'SiO₂',
    name: 'Silicon Dioxide (Quartz)',
    state: 'solid',
    fraction: Number((0.35 * (1 - profile.waterCoverage * 0.4)).toFixed(3)),
    description: 'Primary component of planetary crustal rock.',
  });

  compounds.push({
    formula: 'Fe₂O₃',
    name: 'Iron Oxide (Rust)',
    state: 'solid',
    fraction: Number((0.25 * (profile.earthMasses / 3)).toFixed(3)),
    description: 'Oxidized metallic mantle and crustal deposit.',
  });

  // Carbon Dioxide
  if (profile.atmosphere.pressure > 0.1) {
    compounds.push({
      formula: 'CO₂',
      name: 'Carbon Dioxide',
      state: tempK < 195 ? 'solid' : 'gas',
      fraction: Number((0.15 * Math.min(1, profile.atmosphere.pressure)).toFixed(3)),
      description: 'Major greenhouse gas influencing surface thermal state.',
    });
  }

  // Methane
  if (rng.float(0, 1) > 0.4) {
    compounds.push({
      formula: 'CH₄',
      name: 'Methane',
      state: tempK < 91 ? 'liquid' : 'gas',
      fraction: Number((rng.float(0.02, 0.12)).toFixed(3)),
      description: 'Simple hydrocarbon, potential biomarker or cryogenic sea constituent.',
    });
  }

  // Generate plausible active reactions
  const reactions: ChemicalReaction[] = [];
  if (profile.waterCoverage > 0.1 && profile.atmosphere.pressure > 0.2) {
    reactions.push({
      id: 'iron-ox',
      name: 'Mantle Oxidation',
      reactants: ['Fe', 'O₂', 'H₂O'],
      products: ['Fe₂O₃'],
      rate: Number(rng.float(0.1, 0.6).toFixed(2)),
      energyDelta: 'exothermic',
    });
  }

  if (tempK > 250 && profile.atmosphere.pressure > 0.3) {
    reactions.push({
      id: 'carb-cycle',
      name: 'Carbonate-Silicate Cycle',
      reactants: ['CO₂', 'CaSiO₃'],
      products: ['CaCO₃', 'SiO₂'],
      rate: Number(rng.float(0.2, 0.8).toFixed(2)),
      energyDelta: 'neutral',
    });
  }

  if (profile.lifeProbability > 0.2) {
    reactions.push({
      id: 'photo-synth',
      name: 'Prebiotic Carbon Fixation',
      reactants: ['CO₂', 'H₂O', 'hν'],
      products: ['C₆H₁₂O₆', 'O₂'],
      rate: Number(profile.lifeProbability.toFixed(2)),
      energyDelta: 'endothermic',
    });
  }

  return { elements, compounds, reactions };
}
