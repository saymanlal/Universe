import { Rng, combineSeeds } from '@/core/rng';

/**
 * Deterministic galaxy generation and large-scale structure.
 *
 * Galaxies live on a coarse grid (one candidate galaxy per cell). Whether a
 * cell hosts a galaxy is modulated by a smooth "region density" field, which
 * produces clusters and voids. Galaxies are never stored — like stars, they
 * are a pure function of the universe seed and grid coordinates.
 *
 * Galaxies also shape the star field: `galaxyStarDensityAt` tells the star
 * generator how dense stars should be at a point, so stars concentrate inside
 * galaxies and intergalactic space is nearly empty.
 */

export const GALAXY_CELL_SIZE = 220_000;
/** Galaxy cells per unit of the cluster-density noise (larger = bigger clusters). */
const CLUSTER_SPAN = 5;
/** Approximate simulated stars per unit² of galaxy area (for statistics). */
const STELLAR_DENSITY = 0.03;

export type GalaxyType = 'spiral' | 'elliptical' | 'irregular';

export interface Galaxy {
  id: string;
  name: string | null;
  designation: string;
  x: number;
  y: number;
  type: GalaxyType;
  /** Semi-major radius in world units. */
  radius: number;
  /** Ratio of semi-minor to semi-major axis (1 = circular). */
  eccentricity: number;
  rotation: number; // radians
  armCount: number; // spiral arms
  color: number; // disk tint 0xRRGGBB
  coreColor: number; // bright core tint
  starEstimate: number;
  cell: { gx: number; gy: number };
}

const TYPE_WEIGHTS: [GalaxyType, number][] = [
  ['spiral', 6],
  ['elliptical', 3],
  ['irregular', 1],
];

const DISK_COLORS: Record<GalaxyType, [number, number]> = {
  // [disk, core]
  spiral: [0x8fb4ff, 0xfff1d0],
  elliptical: [0xffe4b0, 0xfff6df],
  irregular: [0x9fd8ff, 0xe8f6ff],
};

const ADJ = ['Whirl', 'Ember', 'Halo', 'Veil', 'Pinwheel', 'Cinder', 'Aurora', 'Mirage', 'Cascade', 'Tempest', 'Lumen', 'Zephyr', 'Obsidian', 'Seraph', 'Vortex'];
const NOUN = ['Wheel', 'Cloud', 'Spiral', 'Reach', 'Expanse', 'Drift', 'Crown', 'Maw', 'Bloom', 'Cluster', 'Nebula', 'Field', 'Realm', 'Coil'];

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Deterministic unit value at a cluster-noise lattice point. */
function cornerValue(seed: number, ix: number, iy: number): number {
  return new Rng(combineSeeds(seed, ix, iy, 0xc1a5)).next();
}

/** Smooth value-noise "region density" in [0,1] driving clusters and voids. */
export function regionDensity(seed: number, gx: number, gy: number): number {
  const nx = gx / CLUSTER_SPAN;
  const ny = gy / CLUSTER_SPAN;
  const ix = Math.floor(nx);
  const iy = Math.floor(ny);
  const fx = smoothstep(nx - ix);
  const fy = smoothstep(ny - iy);
  const v00 = cornerValue(seed, ix, iy);
  const v10 = cornerValue(seed, ix + 1, iy);
  const v01 = cornerValue(seed, ix, iy + 1);
  const v11 = cornerValue(seed, ix + 1, iy + 1);
  const top = v00 + (v10 - v00) * fx;
  const bot = v01 + (v11 - v01) * fx;
  return top + (bot - top) * fy;
}

const cache = new Map<string, Galaxy | null>();

function makeName(rng: Rng): string {
  const name = `${rng.pick(ADJ)} ${rng.pick(NOUN)}`;
  return rng.bool(0.5) ? `The ${name}` : name;
}

function buildGalaxy(seed: number, gx: number, gy: number, forced: boolean): Galaxy {
  const rng = new Rng(combineSeeds(seed, gx, gy, 0x6a1a));
  const type = forced
    ? 'spiral'
    : (TYPE_WEIGHTS[rng.weightedIndex(TYPE_WEIGHTS.map((t) => t[1]))]![0]);

  // Home ("Genesis") galaxy is centred on the origin so a fresh universe opens
  // inside a rich star field rather than empty intergalactic space.
  const x = forced ? 0 : (gx + 0.2 + rng.next() * 0.6) * GALAXY_CELL_SIZE;
  const y = forced ? 0 : (gy + 0.2 + rng.next() * 0.6) * GALAXY_CELL_SIZE;

  const radius = forced ? 66_000 : 18_000 + rng.next() * 40_000;
  const eccentricity = type === 'elliptical' ? 0.55 + rng.next() * 0.4 : 0.65 + rng.next() * 0.35;
  const rotation = rng.float(0, Math.PI * 2);
  const armCount = type === 'spiral' ? rng.int(2, 5) : 0;

  const [color, coreColor] = DISK_COLORS[type];
  const area = Math.PI * radius * (radius * eccentricity);
  const starEstimate = Math.round(area * STELLAR_DENSITY);

  const catalog = combineSeeds(seed, gx * 40503, gy * 30011, 7) % 90000 + 10000;
  const named = forced || rng.bool(0.45);

  return {
    id: `G:${seed}:${gx}:${gy}`,
    name: forced ? 'Genesis' : named ? makeName(rng) : null,
    designation: `NGU-${catalog}`,
    x,
    y,
    type,
    radius,
    eccentricity,
    rotation,
    armCount,
    color,
    coreColor,
    starEstimate,
    cell: { gx, gy },
  };
}

/** The galaxy hosted by cell (gx, gy), or null. Cached (including nulls). */
export function galaxyForCell(seed: number, gx: number, gy: number): Galaxy | null {
  const key = `${seed}:${gx}:${gy}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  const forced = gx === 0 && gy === 0;
  let galaxy: Galaxy | null = null;
  if (forced) {
    galaxy = buildGalaxy(seed, gx, gy, true);
  } else {
    const d = regionDensity(seed, gx, gy);
    const p = Math.min(0.95, Math.pow(d, 1.7) * 1.15);
    const present = new Rng(combineSeeds(seed, gx, gy, 0x9a17)).next() < p;
    if (present) galaxy = buildGalaxy(seed, gx, gy, false);
  }

  cache.set(key, galaxy);
  if (cache.size > 4000) cache.clear();
  return galaxy;
}

export function clearGalaxyCache(): void {
  cache.clear();
}

/** Normalized elliptical radius of a point in a galaxy's frame (<1 = inside). */
function localNorm(g: Galaxy, x: number, y: number): number {
  const dx = x - g.x;
  const dy = y - g.y;
  const cos = Math.cos(-g.rotation);
  const sin = Math.sin(-g.rotation);
  const rx = dx * cos - dy * sin;
  const ry = (dx * sin + dy * cos) / g.eccentricity;
  return Math.sqrt(rx * rx + ry * ry) / g.radius;
}

/** The galaxy containing a world point (nearest by normalized radius), or null. */
export function galaxyAt(seed: number, x: number, y: number): Galaxy | null {
  const gx = Math.floor(x / GALAXY_CELL_SIZE);
  const gy = Math.floor(y / GALAXY_CELL_SIZE);
  let best: Galaxy | null = null;
  let bestN = 1;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const g = galaxyForCell(seed, gx + dx, gy + dy);
      if (!g) continue;
      const n = localNorm(g, x, y);
      if (n < 1 && n < bestN) {
        bestN = n;
        best = g;
      }
    }
  }
  return best;
}

/** Star-field density in [0,1] at a point (0 = intergalactic void). */
export function galaxyStarDensityAt(seed: number, x: number, y: number): number {
  const g = galaxyAt(seed, x, y);
  if (!g) return 0;
  const n = localNorm(g, x, y);
  if (n >= 1) return 0;
  // Bright, dense core falling off toward the rim.
  return Math.pow(1 - n, 1.4);
}

export function findGalaxyById(id: string): Galaxy | null {
  const parts = id.split(':');
  if (parts.length !== 4 || parts[0] !== 'G') return null;
  const seed = Number(parts[1]);
  const gx = Number(parts[2]);
  const gy = Number(parts[3]);
  if ([seed, gx, gy].some((n) => !Number.isFinite(n))) return null;
  return galaxyForCell(seed, gx, gy);
}

/** All galaxies whose cells overlap a world rectangle (for rendering/culling). */
export function galaxiesInRect(
  seed: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  maxCount: number,
): Galaxy[] {
  const minGX = Math.floor(minX / GALAXY_CELL_SIZE) - 1;
  const maxGX = Math.floor(maxX / GALAXY_CELL_SIZE) + 1;
  const minGY = Math.floor(minY / GALAXY_CELL_SIZE) - 1;
  const maxGY = Math.floor(maxY / GALAXY_CELL_SIZE) + 1;
  const out: Galaxy[] = [];
  for (let gy = minGY; gy <= maxGY; gy++) {
    for (let gx = minGX; gx <= maxGX; gx++) {
      const g = galaxyForCell(seed, gx, gy);
      if (g) out.push(g);
      if (out.length >= maxCount) return out;
    }
  }
  return out;
}

export function galaxyTypeLabel(t: GalaxyType): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}
