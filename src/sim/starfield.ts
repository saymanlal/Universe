import { Rng, combineSeeds } from '@/core/rng';
import { generateStar, type Star } from '@/sim/star';
import { galaxyStarDensityAt } from '@/sim/galaxy';

/** World units per star chunk. Matches the renderer's culling grid. */
export const STAR_CHUNK_SIZE = 1600;

const MAX_STARS = 54;
/** LRU-ish cap on cached chunks to bound memory during long sessions. */
const CACHE_LIMIT = 800;

const cache = new Map<string, Star[]>();

function chunkKey(seed: number, cx: number, cy: number): string {
  return `${seed}:${cx}:${cy}`;
}

/**
 * Number of stars in a chunk (deterministic). Density is driven by galactic
 * structure: chunks inside galaxies are rich (denser toward the core), while
 * intergalactic space is nearly empty.
 */
function starCount(seed: number, cx: number, cy: number): number {
  const wx = (cx + 0.5) * STAR_CHUNK_SIZE;
  const wy = (cy + 0.5) * STAR_CHUNK_SIZE;
  const density = galaxyStarDensityAt(seed, wx, wy);
  const rng = new Rng(combineSeeds(seed, cx, cy, 0xc0117));

  if (density <= 0) {
    // Rare intergalactic stragglers keep the void from looking totally dead.
    return rng.next() < 0.12 ? 1 : 0;
  }
  const jitter = 0.7 + rng.next() * 0.3;
  return Math.max(1, Math.round(density * MAX_STARS * jitter));
}

/** All stars in a chunk (cached). Deterministic and lazy. */
export function generateChunkStars(seed: number, cx: number, cy: number): Star[] {
  const key = chunkKey(seed, cx, cy);
  const hit = cache.get(key);
  if (hit) {
    // Refresh LRU position.
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }

  const n = starCount(seed, cx, cy);
  const stars: Star[] = new Array(n);
  for (let i = 0; i < n; i++) {
    stars[i] = generateStar(seed, cx, cy, i, STAR_CHUNK_SIZE);
  }

  cache.set(key, stars);
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return stars;
}

/** Clear the cache (e.g. when switching universes). */
export function clearStarCache(): void {
  cache.clear();
}

function chunkRange(minX: number, minY: number, maxX: number, maxY: number) {
  return {
    minCX: Math.floor(minX / STAR_CHUNK_SIZE),
    maxCX: Math.floor(maxX / STAR_CHUNK_SIZE),
    minCY: Math.floor(minY / STAR_CHUNK_SIZE),
    maxCY: Math.floor(maxY / STAR_CHUNK_SIZE),
  };
}

/** Find the nearest star to a world point within `maxDist` world units. */
export function nearestStar(
  seed: number,
  wx: number,
  wy: number,
  maxDist: number,
): Star | null {
  const cx = Math.floor(wx / STAR_CHUNK_SIZE);
  const cy = Math.floor(wy / STAR_CHUNK_SIZE);
  let best: Star | null = null;
  let bestD = Infinity;
  // Search the surrounding 3×3 chunks so hits near a chunk edge still resolve.
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      for (const s of generateChunkStars(seed, cx + dx, cy + dy)) {
        const ddx = s.x - wx;
        const ddy = s.y - wy;
        const d = Math.sqrt(ddx * ddx + ddy * ddy);
        // A click always registers within the star's own drawn radius.
        const threshold = Math.max(maxDist, s.renderRadius);
        if (d <= threshold && d < bestD) {
          bestD = d;
          best = s;
        }
      }
    }
  }
  return best;
}

/** Resolve a star from its stable id (regenerates its chunk). */
export function findStarById(id: string): Star | null {
  const parts = id.split(':');
  if (parts.length !== 5 || parts[0] !== 'S') return null;
  const seed = Number(parts[1]);
  const cx = Number(parts[2]);
  const cy = Number(parts[3]);
  const i = Number(parts[4]);
  if ([seed, cx, cy, i].some((n) => !Number.isFinite(n))) return null;
  const stars = generateChunkStars(seed, cx, cy);
  return stars[i] ?? null;
}

export interface StarSearchResult {
  star: Star;
  score: number;
}

/**
 * Search stars by name or designation within a bounded region around a centre
 * point. Space is infinite, so search is necessarily windowed — `radiusChunks`
 * controls how far out we scan. Results are ranked by match quality then
 * luminosity and capped to `limit`.
 */
export function searchStars(
  seed: number,
  query: string,
  centerX: number,
  centerY: number,
  radiusChunks = 7,
  limit = 40,
): StarSearchResult[] {
  const q = query.trim().toLowerCase();
  if (q === '') return [];

  const ccx = Math.floor(centerX / STAR_CHUNK_SIZE);
  const ccy = Math.floor(centerY / STAR_CHUNK_SIZE);
  const results: StarSearchResult[] = [];

  for (let dy = -radiusChunks; dy <= radiusChunks; dy++) {
    for (let dx = -radiusChunks; dx <= radiusChunks; dx++) {
      for (const s of generateChunkStars(seed, ccx + dx, ccy + dy)) {
        const name = s.name?.toLowerCase() ?? '';
        const desig = s.designation.toLowerCase();
        let score = 0;
        if (name === q || desig === q) score = 100;
        else if (name.startsWith(q)) score = 80;
        else if (desig.startsWith(q)) score = 70;
        else if (name.includes(q)) score = 50;
        else if (desig.includes(q)) score = 40;
        if (score > 0) {
          // Tie-break toward brighter, more interesting stars.
          score += Math.min(19, Math.log10(1 + s.luminosity) * 6);
          results.push({ star: s, score });
        }
      }
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

/** Count stars in a world rectangle (used for HUD telemetry). */
export function countStarsInRect(
  seed: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  maxChunks: number,
): number {
  const { minCX, maxCX, minCY, maxCY } = chunkRange(minX, minY, maxX, maxY);
  let count = 0;
  let chunks = 0;
  for (let cy = minCY; cy <= maxCY; cy++) {
    for (let cx = minCX; cx <= maxCX; cx++) {
      if (chunks >= maxChunks) return count;
      count += generateChunkStars(seed, cx, cy).length;
      chunks++;
    }
  }
  return count;
}
