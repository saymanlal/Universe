import { Rng } from '@/core/rng';
import { YEAR_SECONDS } from '@/core/format';
import { findStarById } from '@/sim/starfield';
import type { Star } from '@/sim/star';

/**
 * Deterministic solar-system generation: planets and moons orbiting a star.
 *
 * A star's system is a pure function of the star (itself a pure function of the
 * universe seed), so it is never stored. Orbital positions are a function of
 * the simulation clock, so planets revolve as time advances — deterministically
 * and reproducibly.
 *
 * Phase 6 establishes the orbital structure + core properties. Phase 7 deepens
 * planetary detail (biome, atmosphere, water, gravity, life probability) on top
 * of this same base without rewriting it.
 */

export type PlanetType = 'lava' | 'rocky' | 'desert' | 'ocean' | 'terran' | 'ice' | 'gas' | 'iceGiant';

export interface Moon {
  id: string;
  name: string;
  index: number;
  orbitRadius: number; // world units from the planet
  period: number; // seconds
  phase: number; // initial angle (radians)
  radius: number; // world-unit render radius
  color: number;
}

export interface Planet {
  id: string;
  starId: string;
  index: number;
  name: string;
  type: PlanetType;
  /** Orbit semi-major radius in world units. */
  orbitRadius: number;
  /** Orbital distance mapped to AU (for readouts / physics). */
  distanceAU: number;
  period: number; // seconds for a full revolution
  phase: number; // initial angle (radians)
  /** Planet size in Earth radii (physical) and world units (render). */
  earthRadii: number;
  radius: number; // world-unit render radius
  color: number;
  /** Equilibrium temperature estimate (K). */
  temperature: number;
  moons: Moon[];
}

/** World units per AU (sets the visual scale of orbits). */
const UNITS_PER_AU = 20;

const TYPE_COLORS: Record<PlanetType, number> = {
  lava: 0xff6b3d,
  rocky: 0xb08d6a,
  desert: 0xd9a441,
  ocean: 0x3d7bd9,
  terran: 0x4fae6b,
  ice: 0xbfe6ff,
  gas: 0xd8a066,
  iceGiant: 0x7fb8e6,
};

function romanNumeral(n: number): string {
  const map: [number, string][] = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let out = '';
  let v = n;
  for (const [val, sym] of map) {
    while (v >= val) {
      out += sym;
      v -= val;
    }
  }
  return out || 'I';
}

/** Classify a planet from its size and equilibrium temperature. */
function classify(earthRadii: number, temperature: number): PlanetType {
  if (earthRadii >= 3.5) return temperature < 130 ? 'iceGiant' : 'gas';
  if (temperature > 1100) return 'lava';
  if (temperature > 600) return 'desert';
  if (temperature < 200) return 'ice';
  if (temperature >= 255 && temperature <= 320) return 'terran';
  if (temperature >= 200 && temperature < 255) return 'ocean';
  return 'rocky';
}

const cache = new Map<string, Planet[]>();

function buildSystem(star: Star): Planet[] {
  const rng = Rng.from(star.id, 'system-v1');

  // Planet count: most stars host a handful; some none.
  const count = Math.max(0, Math.min(9, Math.round(rng.gaussian(4, 2.1))));
  const planets: Planet[] = [];

  let orbit = 12 + rng.float(0, 8); // inner edge
  for (let i = 0; i < count; i++) {
    orbit += rng.float(9, 16) + i * 1.6; // spacing grows outward
    const distanceAU = orbit / UNITS_PER_AU;

    // Equilibrium temperature: 278 K · L^¼ / √a.
    const temperature = Math.round((278 * Math.pow(star.luminosity, 0.25)) / Math.sqrt(distanceAU));

    // Size: outer orbits are more likely to be giants.
    const giantBias = Math.min(0.6, distanceAU / 12);
    const isGiant = rng.bool(0.18 + giantBias);
    const earthRadii = isGiant
      ? +(3.6 + rng.next() * 7).toFixed(2)
      : +(0.35 + rng.next() * 2.4).toFixed(2);

    const type = classify(earthRadii, temperature);
    const radius = +(0.5 + earthRadii * 0.28).toFixed(2);

    // Kepler's third law (solar units): P(yr) = a^1.5 / √M.
    const periodYears = Math.pow(distanceAU, 1.5) / Math.sqrt(star.mass);
    const period = Math.max(1, periodYears * YEAR_SECONDS);
    const phase = rng.float(0, Math.PI * 2);

    const name = `${star.name ?? star.designation} ${romanNumeral(i + 1)}`;
    const moons = buildMoons(rng, star.id, i, name, radius, type);

    planets.push({
      id: `P|${star.id}|${i}`,
      starId: star.id,
      index: i,
      name,
      type,
      orbitRadius: +orbit.toFixed(2),
      distanceAU: +distanceAU.toFixed(3),
      period,
      phase,
      earthRadii,
      radius,
      color: TYPE_COLORS[type],
      temperature,
      moons,
    });
  }
  return planets;
}

function buildMoons(
  rng: Rng,
  starId: string,
  planetIndex: number,
  planetName: string,
  planetRadius: number,
  type: PlanetType,
): Moon[] {
  const giant = type === 'gas' || type === 'iceGiant';
  const count = giant ? rng.int(1, 6) : rng.bool(0.5) ? rng.int(0, 2) : 0;
  const moons: Moon[] = [];
  let r = planetRadius + rng.float(2, 4);
  for (let m = 0; m < count; m++) {
    r += rng.float(1.4, 3) + m * 0.8;
    const period = Math.max(1, (0.15 + rng.next() * 1.2) * (86400 * 20)); // ~ days–weeks
    moons.push({
      id: `M|${starId}|${planetIndex}|${m}`,
      name: `${planetName} ${String.fromCharCode(97 + m)}`,
      index: m,
      orbitRadius: +r.toFixed(2),
      period,
      phase: rng.float(0, Math.PI * 2),
      radius: +(0.18 + rng.next() * 0.4).toFixed(2),
      color: 0xcfd6e6,
    });
  }
  return moons;
}

/** All planets orbiting a star (cached, deterministic). */
export function generateSystem(star: Star): Planet[] {
  const hit = cache.get(star.id);
  if (hit) return hit;
  const planets = buildSystem(star);
  cache.set(star.id, planets);
  if (cache.size > 400) cache.clear();
  return planets;
}

export function clearSystemCache(): void {
  cache.clear();
}

export function planetAngle(planet: Planet, simTime: number): number {
  return planet.phase + (2 * Math.PI * simTime) / planet.period;
}

export function planetPosition(star: Star, planet: Planet, simTime: number): { x: number; y: number } {
  const a = planetAngle(planet, simTime);
  return { x: star.x + Math.cos(a) * planet.orbitRadius, y: star.y + Math.sin(a) * planet.orbitRadius };
}

export function moonPosition(
  star: Star,
  planet: Planet,
  moon: Moon,
  simTime: number,
): { x: number; y: number } {
  const p = planetPosition(star, planet, simTime);
  const a = moon.phase + (2 * Math.PI * simTime) / moon.period;
  return { x: p.x + Math.cos(a) * moon.orbitRadius, y: p.y + Math.sin(a) * moon.orbitRadius };
}

export interface ResolvedOrbit {
  star: Star;
  planet: Planet;
  moon: Moon | null;
}

/** Resolve a planet or moon id back to its star/planet/moon (regenerates). */
export function resolveOrbitId(id: string): ResolvedOrbit | null {
  const parts = id.split('|');
  const kind = parts[0];
  if (kind !== 'P' && kind !== 'M') return null;
  const starId = parts[1];
  if (!starId) return null;
  const star = findStarById(starId);
  if (!star) return null;
  const planets = generateSystem(star);
  const pi = Number(parts[2]);
  const planet = planets[pi];
  if (!planet) return null;
  if (kind === 'P') return { star, planet, moon: null };
  const mi = Number(parts[3]);
  const moon = planet.moons[mi];
  if (!moon) return null;
  return { star, planet, moon };
}

export function planetTypeLabel(type: PlanetType): string {
  switch (type) {
    case 'iceGiant':
      return 'Ice giant';
    case 'gas':
      return 'Gas giant';
    case 'terran':
      return 'Terran';
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}
