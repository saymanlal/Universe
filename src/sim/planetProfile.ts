import { Rng } from '@/core/rng';
import type { Planet, PlanetType } from '@/sim/planet';
import type { Star } from '@/sim/star';

/**
 * Deep, deterministic planetary profile derived from a Planet + its Star.
 *
 * Phase 6 established orbital structure and a coarse planet type. Phase 7
 * layers physical and surface detail on top — mass, gravity, rotation,
 * atmosphere, water, biome and a life-probability index — without changing the
 * Phase 6 base. Everything is a pure function of the planet id (which itself
 * derives from the universe seed), so profiles never need to be stored.
 */

export interface AtmosphereComponent {
  gas: string;
  fraction: number; // 0..1
}

import { generateResourceProfile, type BodyResourceProfile } from '@/sim/resources';

export interface PlanetProfile {
  earthMasses: number;
  densityRel: number; // relative to Earth
  gravity: number; // g (Earth = 1)
  rotationHours: number;
  tidallyLocked: boolean;
  axialTilt: number; // degrees
  atmosphere: {
    pressure: number; // atm
    label: string;
    components: AtmosphereComponent[];
  };
  waterCoverage: number; // 0..1 of surface as liquid water
  surfaceTemp: number; // K, including greenhouse
  biome: string;
  albedo: number;
  habitability: number; // 0..1
  lifeProbability: number; // 0..1
  lifeLabel: string;
  resources: BodyResourceProfile;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Relative density (Earth = 1) by planet class. */
function densityForType(type: PlanetType, rng: Rng): number {
  switch (type) {
    case 'gas':
      return 0.12 + rng.next() * 0.14;
    case 'iceGiant':
      return 0.22 + rng.next() * 0.18;
    case 'ice':
      return 0.5 + rng.next() * 0.25;
    case 'ocean':
      return 0.8 + rng.next() * 0.2;
    default: // lava, rocky, desert, terran
      return 0.85 + rng.next() * 0.4;
  }
}

function buildAtmosphere(
  type: PlanetType,
  gravity: number,
  eqTemp: number,
  rng: Rng,
): PlanetProfile['atmosphere'] {
  const mk = (label: string, components: AtmosphereComponent[], pressure: number) => ({
    label,
    components,
    pressure: +pressure.toFixed(3),
  });

  if (type === 'gas') {
    return mk(
      'Hydrogen–Helium',
      [
        { gas: 'H₂', fraction: 0.9 },
        { gas: 'He', fraction: 0.09 },
        { gas: 'CH₄', fraction: 0.01 },
      ],
      1000 + rng.next() * 9000,
    );
  }
  if (type === 'iceGiant') {
    return mk(
      'Hydrogen, Helium, Methane',
      [
        { gas: 'H₂', fraction: 0.83 },
        { gas: 'He', fraction: 0.15 },
        { gas: 'CH₄', fraction: 0.02 },
      ],
      200 + rng.next() * 800,
    );
  }

  // Rocky-family: retention scales with gravity, loss with heat.
  const retain = clamp01(gravity * 0.7) * clamp01(1.4 - eqTemp / 900);
  const base = retain * (0.2 + rng.next() * 2.5);
  if (base < 0.02) {
    return mk('Trace / none', [{ gas: 'trace', fraction: 1 }], base);
  }
  if (eqTemp > 600) {
    return mk(
      'Carbon dioxide (dense)',
      [
        { gas: 'CO₂', fraction: 0.9 },
        { gas: 'SO₂', fraction: 0.06 },
        { gas: 'N₂', fraction: 0.04 },
      ],
      base * 3,
    );
  }
  if (eqTemp < 200) {
    return mk(
      'Nitrogen, Methane (thin)',
      [
        { gas: 'N₂', fraction: 0.9 },
        { gas: 'CH₄', fraction: 0.1 },
      ],
      base * 0.6,
    );
  }
  // Temperate: chance of an oxygen-bearing atmosphere.
  if (rng.bool(0.5)) {
    const o2 = 0.15 + rng.next() * 0.12;
    return mk(
      'Nitrogen–Oxygen',
      [
        { gas: 'N₂', fraction: +(1 - o2 - 0.02).toFixed(2) },
        { gas: 'O₂', fraction: +o2.toFixed(2) },
        { gas: 'Ar', fraction: 0.02 },
      ],
      base,
    );
  }
  return mk(
    'Nitrogen, Carbon dioxide',
    [
      { gas: 'N₂', fraction: 0.7 },
      { gas: 'CO₂', fraction: 0.28 },
      { gas: 'Ar', fraction: 0.02 },
    ],
    base,
  );
}

function lifeLabelFor(p: number): string {
  if (p < 0.05) return 'None expected';
  if (p < 0.2) return 'Unlikely';
  if (p < 0.45) return 'Possible';
  if (p < 0.7) return 'Probable';
  return 'Teeming';
}

/** Bell-shaped preference centred on `mid`, ~1 within `half`, falling to 0. */
function bell(value: number, mid: number, half: number): number {
  const d = (value - mid) / half;
  return Math.exp(-d * d);
}

function computeBiome(
  type: PlanetType,
  surfaceTemp: number,
  water: number,
  habitability: number,
): string {
  if (type === 'gas') return 'Gas giant · no solid surface';
  if (type === 'iceGiant') return 'Ice giant · no solid surface';
  if (surfaceTemp > 1000) return 'Molten';
  if (surfaceTemp > 500) return 'Scorched desert';
  if (surfaceTemp < 200) return water > 0 ? 'Glacial' : 'Frozen barren';
  if (water > 0.65) return 'Ocean world';
  if (water > 0.25) return habitability > 0.45 ? 'Verdant / temperate' : 'Temperate';
  if (water > 0.05) return 'Semi-arid';
  return 'Arid rock';
}

const cache = new Map<string, PlanetProfile>();

export function computeProfile(planet: Planet, star: Star): PlanetProfile {
  const hit = cache.get(planet.id);
  if (hit) return hit;

  const rng = Rng.from(planet.id, 'profile-v1');

  const densityRel = +densityForType(planet.type, rng).toFixed(3);
  const earthMasses = +(densityRel * Math.pow(planet.earthRadii, 3)).toFixed(3);
  const gravity = +(earthMasses / (planet.earthRadii * planet.earthRadii)).toFixed(3);

  const tidallyLocked = planet.distanceAU < 0.08 && rng.bool(0.8);
  const rotationHours = tidallyLocked
    ? +(planet.period / 3600).toFixed(1)
    : +(6 + Math.abs(rng.gaussian(18, 12))).toFixed(1);
  const axialTilt = +Math.abs(rng.gaussian(15, 14)).toFixed(1);

  const eqTemp = planet.temperature;
  const atmosphere = buildAtmosphere(planet.type, gravity, eqTemp, rng);

  // Greenhouse warming grows with atmospheric pressure (log-compressed).
  const greenhouse = 1 + Math.min(0.9, Math.log10(1 + atmosphere.pressure) * 0.22);
  const surfaceTemp = Math.round(eqTemp * greenhouse);

  const rocky = !(planet.type === 'gas' || planet.type === 'iceGiant');
  let waterCoverage = 0;
  if (rocky && surfaceTemp >= 240 && surfaceTemp <= 360 && atmosphere.pressure > 0.05) {
    const baseline = planet.type === 'ocean' ? 0.75 : planet.type === 'terran' ? 0.45 : 0.15;
    waterCoverage = clamp01(baseline * (0.6 + rng.next() * 0.7));
  }

  const albedo = +clamp01(0.1 + waterCoverage * 0.2 + (surfaceTemp < 220 ? 0.4 : 0) + rng.next() * 0.1).toFixed(2);

  // Habitability: a product of independent "comfort" factors.
  const starFactor =
    star.spectral === 'G' || star.spectral === 'K'
      ? 1
      : star.spectral === 'F' || star.spectral === 'M'
        ? 0.6
        : 0.15;
  const habitability = rocky
    ? +clamp01(
        bell(surfaceTemp, 290, 45) *
          (0.25 + waterCoverage) *
          bell(gravity, 1, 1.1) *
          bell(atmosphere.pressure, 1, 2.2) *
          starFactor,
      ).toFixed(3)
    : 0;

  const lifeProbability = +clamp01(habitability * (0.75 + rng.next() * 0.25)).toFixed(3);
  const biome = computeBiome(planet.type, surfaceTemp, waterCoverage, habitability);

  const partialProfile = {
    earthMasses,
    densityRel,
    gravity,
    rotationHours,
    tidallyLocked,
    axialTilt,
    atmosphere,
    waterCoverage: +waterCoverage.toFixed(3),
    surfaceTemp,
    biome,
    albedo,
    habitability,
    lifeProbability,
    lifeLabel: lifeLabelFor(lifeProbability),
  };

  const resources = generateResourceProfile(star, planet, partialProfile);

  const profile: PlanetProfile = {
    earthMasses,
    densityRel,
    gravity,
    rotationHours,
    tidallyLocked,
    axialTilt,
    atmosphere,
    waterCoverage: +waterCoverage.toFixed(3),
    surfaceTemp,
    biome,
    albedo,
    habitability,
    lifeProbability,
    lifeLabel: lifeLabelFor(lifeProbability),
    resources,
  };

  cache.set(planet.id, profile);
  if (cache.size > 600) cache.clear();
  return profile;
}

export function clearProfileCache(): void {
  cache.clear();
}
