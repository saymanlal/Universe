import { Rng, combineSeeds } from '@/core/rng';
import type { PlanetProfile } from '@/sim/planetProfile';
import type { Star } from '@/sim/star';

/**
 * Resource abundance & distribution engine.
 * 
 * Resources are derived deterministically per celestial body (Planet/Star/Galaxy/Asteroids)
 * from seeds, physical profile, and orbital properties. No static resource database needed.
 */

export interface ResourceDeposit {
  id: string;
  name: string;
  category: 'mineral' | 'liquid' | 'gas' | 'energy';
  abundance: number; // 0.0 to 1.0 (relative density)
  reserveUnits: number; // total estimated raw reserve units
  accessibility: number; // 0.0 (deep mantle/core) to 1.0 (surface/crust)
  description: string;
}

export interface BodyResourceProfile {
  minerals: {
    silicates: number;
    ferrousMetals: number; // Iron, Nickel
    preciousMetals: number; // Gold, Platinum
    heavyElements: number; // Uranium, Thorium
    rareEarths: number;
  };
  liquids: {
    waterIce: number;
    liquidWater: number;
    hydrocarbons: number; // Methane, Ethane oceans
  };
  gases: {
    hydrogen: number;
    helium: number;
    nitrogen: number;
    oxygen: number;
    nobleGases: number;
  };
  energy: {
    solarIrradiance: number; // W/m^2 based on star distance & luminosity
    geothermalEnergy: number; // heat flux from core/tidal forces
    windEnergy: number; // atmospheric dynamic energy potential
    fusionFuel: number; // Deuterium / Helium-3 abundance
  };
  deposits: ResourceDeposit[];
}

import type { Planet } from '@/sim/planet';

export function generateResourceProfile(
  star: Star,
  basePlanet: Planet,
  planet: Omit<PlanetProfile, 'resources'>,
): BodyResourceProfile {
  const seed = combineSeeds(star.x, star.y, basePlanet.index, 0x73507); // 0x73507 = RES
  const rng = new Rng(seed);

  const mass = planet.earthMasses;
  const temp = planet.surfaceTemp;
  const press = planet.atmosphere.pressure;
  const gravity = planet.gravity;

  // 1. Minerals
  let silicates = rng.float(0.4, 0.9);
  let ferrousMetals = rng.float(0.1, 0.6);
  let preciousMetals = rng.float(0.01, 0.15);
  let heavyElements = rng.float(0.001, 0.05);
  let rareEarths = rng.float(0.005, 0.08);

  if (basePlanet.type === 'lava') {
    ferrousMetals *= 1.5;
    heavyElements *= 2.0;
  } else if (basePlanet.type === 'gas' || basePlanet.type === 'iceGiant') {
    silicates *= 0.05;
    ferrousMetals *= 0.05;
    preciousMetals *= 0.01;
    heavyElements *= 0.02;
  }

  // 2. Liquids
  const waterIce = planet.waterCoverage > 0 && temp < 273.15 ? planet.waterCoverage : (temp < 250 ? rng.float(0.1, 0.8) : 0);
  const liquidWater = temp >= 273.15 && temp <= 373.15 && press >= 0.1 ? planet.waterCoverage : 0;
  const hydrocarbons = temp < 200 && press > 0.5 ? rng.float(0.2, 0.8) : 0;

  // 3. Gases
  let hydrogen = 0;
  let helium = 0;
  let nitrogen = 0;
  let oxygen = 0;
  let nobleGases = rng.float(0.001, 0.02);

  if (basePlanet.type === 'gas') {
    hydrogen = rng.float(0.70, 0.85);
    helium = 1 - hydrogen - rng.float(0.01, 0.05);
  } else if (basePlanet.type === 'iceGiant') {
    hydrogen = rng.float(0.40, 0.60);
    helium = rng.float(0.15, 0.30);
  } else {
    for (const comp of planet.atmosphere.components) {
      if (comp.gas === 'N₂') nitrogen += comp.fraction;
      if (comp.gas === 'O₂') oxygen += comp.fraction;
      if (comp.gas === 'H₂') hydrogen += comp.fraction;
      if (comp.gas === 'He') helium += comp.fraction;
    }
  }

  // 4. Energy
  // Solar Irradiance: S = L / (4 * pi * d^2), scale relative to Earth (~1361 W/m^2)
  const distAU = Math.max(0.05, basePlanet.distanceAU);
  const solarIrradiance = Math.round((star.luminosity / (distAU * distAU)) * 1361);
  
  // Geothermal from tidal forces & core mass
  const geothermalEnergy = Math.min(100, Math.round(mass * gravity * (1 + (1 / distAU) * 0.2) * rng.float(5, 15)));
  
  // Wind potential from pressure & temp diff
  const windEnergy = Math.min(100, Math.round(press * Math.abs(temp - 270) * rng.float(0.1, 0.4)));
  
  // Fusion fuel (Deuterium / He3)
  const fusionFuel = Math.min(100, Math.round((hydrogen * 100 + helium * 50) * rng.float(0.5, 1.2)));

  // Generate discrete major deposits
  const deposits: ResourceDeposit[] = [];
  if (silicates > 0.2) {
    deposits.push({
      id: `dep_sil_${seed}`,
      name: 'Silicate Crust Formation',
      category: 'mineral',
      abundance: Math.min(1, silicates),
      reserveUnits: Math.round(mass * silicates * 1e9),
      accessibility: 0.9,
      description: 'Extensive surface quartz, feldspar, and basalt deposits.',
    });
  }
  if (ferrousMetals > 0.2) {
    deposits.push({
      id: `dep_iron_${seed}`,
      name: 'Magnetite & Iron Belt',
      category: 'mineral',
      abundance: Math.min(1, ferrousMetals),
      reserveUnits: Math.round(mass * ferrousMetals * 5e8),
      accessibility: 0.7,
      description: 'Rich iron-nickel ore veins concentrated in tectonic fracture zones.',
    });
  }
  if (liquidWater > 0.1) {
    deposits.push({
      id: `dep_water_${seed}`,
      name: 'Hydrosphere Reservoir',
      category: 'liquid',
      abundance: Math.min(1, liquidWater),
      reserveUnits: Math.round(mass * liquidWater * 2e9),
      accessibility: 1.0,
      description: 'Open surface water bodies suitable for extraction and life support.',
    });
  }
  if (hydrocarbons > 0.1) {
    deposits.push({
      id: `dep_hc_${seed}`,
      name: 'Cryo-Hydrocarbon Basins',
      category: 'liquid',
      abundance: Math.min(1, hydrocarbons),
      reserveUnits: Math.round(mass * hydrocarbons * 8e8),
      accessibility: 0.85,
      description: 'Liquid methane and ethane lakes rich in complex organic precursors.',
    });
  }
  if (hydrogen > 0.3) {
    deposits.push({
      id: `dep_h2_${seed}`,
      name: 'Atmospheric Deuterium Reservoir',
      category: 'gas',
      abundance: Math.min(1, hydrogen),
      reserveUnits: Math.round(mass * hydrogen * 1e10),
      accessibility: 0.5,
      description: 'Vast upper atmosphere hydrogen abundance ideal for stellar fuel refining.',
    });
  }
  if (heavyElements > 0.02) {
    deposits.push({
      id: `dep_radio_${seed}`,
      name: 'Fissile Uraninite Veins',
      category: 'mineral',
      abundance: Math.min(1, heavyElements * 5),
      reserveUnits: Math.round(mass * heavyElements * 1e7),
      accessibility: 0.4,
      description: 'Radioactive ore nodes capable of supporting nuclear fission fuel cycles.',
    });
  }

  return {
    minerals: { silicates, ferrousMetals, preciousMetals, heavyElements, rareEarths },
    liquids: { waterIce, liquidWater, hydrocarbons },
    gases: { hydrogen, helium, nitrogen, oxygen, nobleGases },
    energy: { solarIrradiance, geothermalEnergy, windEnergy, fusionFuel },
    deposits,
  };
}
