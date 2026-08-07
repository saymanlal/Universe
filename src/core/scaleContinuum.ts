/**
 * 15-Tier Scale Continuum Hierarchy Definition.
 * Spans from Observable Universe (10^26 m) to Subatomic (10^-15 m).
 */

export enum ScaleLevel {
  ObservableUniverse = 0, // ~10^26 m
  Superclusters = 1,      // ~10^24 m
  GalaxyClusters = 2,     // ~10^22 m
  Galaxies = 3,           // ~10^20 m
  StellarRegions = 4,     // ~10^13 m
  PlanetsAndMoons = 5,    // ~10^7 m
  Continental = 6,        // ~10^5 m
  Cities = 7,             // ~10^3 m
  Buildings = 8,          // ~10^1 m
  Rooms = 9,              // ~10^0 m
  Individuals = 10,       // ~10^-1 m
  OrgansAndObjects = 11,  // ~10^-3 m
  Cellular = 12,          // ~10^-6 m
  Molecular = 13,         // ~10^-9 m
  Subatomic = 14          // ~10^-15 m
}

export interface ScaleTierConfig {
  level: ScaleLevel;
  name: string;
  unit: string;
  exponentMeters: number;
  minZoomThreshold: number;
  maxZoomThreshold: number;
  description: string;
}

export const SCALE_TIERS: ScaleTierConfig[] = [
  {
    level: ScaleLevel.ObservableUniverse,
    name: 'Observable Universe',
    unit: 'Gpc',
    exponentMeters: 26,
    minZoomThreshold: 0,
    maxZoomThreshold: 0.00001,
    description: 'The totality of space and time containing cosmic web filaments.'
  },
  {
    level: ScaleLevel.Superclusters,
    name: 'Superclusters',
    unit: 'Mpc',
    exponentMeters: 24,
    minZoomThreshold: 0.00001,
    maxZoomThreshold: 0.0001,
    description: 'Massive structures comprising tens of thousands of galaxies.'
  },
  {
    level: ScaleLevel.GalaxyClusters,
    name: 'Galaxy Clusters',
    unit: 'Mpc',
    exponentMeters: 22,
    minZoomThreshold: 0.0001,
    maxZoomThreshold: 0.001,
    description: 'Gravitationally bound groups of galaxies bound by dark matter.'
  },
  {
    level: ScaleLevel.Galaxies,
    name: 'Galaxies',
    unit: 'kpc',
    exponentMeters: 20,
    minZoomThreshold: 0.001,
    maxZoomThreshold: 0.01,
    description: 'Spinning stellar disks, nebulae, supermassive black holes.'
  },
  {
    level: ScaleLevel.StellarRegions,
    name: 'Solar Systems',
    unit: 'AU',
    exponentMeters: 13,
    minZoomThreshold: 0.01,
    maxZoomThreshold: 0.1,
    description: 'Stars, orbiting planets, asteroid belts, solar winds.'
  },
  {
    level: ScaleLevel.PlanetsAndMoons,
    name: 'Planets & Moons',
    unit: 'km',
    exponentMeters: 7,
    minZoomThreshold: 0.1,
    maxZoomThreshold: 1.0,
    description: 'Planetary crusts, atmospheric halos, magnetospheres, moons.'
  },
  {
    level: ScaleLevel.Continental,
    name: 'Continental / Region',
    unit: 'km',
    exponentMeters: 5,
    minZoomThreshold: 1.0,
    maxZoomThreshold: 10.0,
    description: 'Tectonic landmasses, oceans, biomes, mountain ranges.'
  },
  {
    level: ScaleLevel.Cities,
    name: 'Cities & Settlements',
    unit: 'm',
    exponentMeters: 3,
    minZoomThreshold: 10.0,
    maxZoomThreshold: 100.0,
    description: 'Urban networks, trade infrastructures, farmland.'
  },
  {
    level: ScaleLevel.Buildings,
    name: 'Buildings & Structures',
    unit: 'm',
    exponentMeters: 1,
    minZoomThreshold: 100.0,
    maxZoomThreshold: 1000.0,
    description: 'Architectural complexes, transport hubs, megastructures.'
  },
  {
    level: ScaleLevel.Rooms,
    name: 'Rooms & Enclosures',
    unit: 'm',
    exponentMeters: 0,
    minZoomThreshold: 1000.0,
    maxZoomThreshold: 10000.0,
    description: 'Internal living spaces, laboratory enclosures, work quarters.'
  },
  {
    level: ScaleLevel.Individuals,
    name: 'Individuals & Organisms',
    unit: 'cm',
    exponentMeters: -1,
    minZoomThreshold: 10000.0,
    maxZoomThreshold: 100000.0,
    description: 'Intelligent entities, flora, fauna, exotic biological life.'
  },
  {
    level: ScaleLevel.OrgansAndObjects,
    name: 'Organs & Artifacts',
    unit: 'mm',
    exponentMeters: -3,
    minZoomThreshold: 100000.0,
    maxZoomThreshold: 1000000.0,
    description: 'Biological organ systems, tools, micro-machinery.'
  },
  {
    level: ScaleLevel.Cellular,
    name: 'Cellular Layer',
    unit: 'µm',
    exponentMeters: -6,
    minZoomThreshold: 1000000.0,
    maxZoomThreshold: 10000000.0,
    description: 'Single-cell microbes, DNA strands, organelles.'
  },
  {
    level: ScaleLevel.Molecular,
    name: 'Molecular Layer',
    unit: 'nm',
    exponentMeters: -9,
    minZoomThreshold: 10000000.0,
    maxZoomThreshold: 100000000.0,
    description: 'Complex chemical compound lattices, polymer chains.'
  },
  {
    level: ScaleLevel.Subatomic,
    name: 'Subatomic Visualization',
    unit: 'fm',
    exponentMeters: -15,
    minZoomThreshold: 100000000.0,
    maxZoomThreshold: Infinity,
    description: 'Quarks, gluons, quantum probability clouds, field fluctuations.'
  }
];

export function getScaleTierFromZoom(zoom: number): ScaleTierConfig {
  for (let i = SCALE_TIERS.length - 1; i >= 0; i--) {
    if (zoom >= SCALE_TIERS[i].minZoomThreshold) {
      return SCALE_TIERS[i];
    }
  }
  return SCALE_TIERS[0];
}
