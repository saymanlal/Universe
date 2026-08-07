/**
 * Deterministic pseudo-random number generation.
 *
 * The entire Universe Engine is deterministic: every star, planet, and being
 * is derived from seeds rather than stored. These primitives are the single
 * source of randomness and MUST stay pure (no Date.now, no Math.random) so
 * that a given seed always reproduces the same universe.
 */

/**
 * MurmurHash3 (x86, 32-bit) style string hasher.
 * Produces a well-distributed 32-bit unsigned integer from a string.
 */
export function hashString(str: string, seed = 0): number {
  let h = seed >>> 0;
  const len = str.length;
  for (let i = 0; i < len; i++) {
    let k = str.charCodeAt(i);
    k = Math.imul(k, 0xcc9e2d51);
    k = (k << 15) | (k >>> 17);
    k = Math.imul(k, 0x1b873593);
    h ^= k;
    h = (h << 13) | (h >>> 19);
    h = (Math.imul(h, 5) + 0xe6546b64) >>> 0;
  }
  h ^= len;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * Combine multiple integer seeds into a single well-mixed 32-bit seed.
 * Used to derive child seeds (e.g. universe -> galaxy -> star) so that each
 * layer of the hierarchy is deterministic and independent.
 */
export function combineSeeds(...seeds: number[]): number {
  let h = 0x9e3779b9;
  for (const s of seeds) {
    h ^= s >>> 0;
    h = Math.imul(h, 0x85ebca6b);
    h = (h << 13) | (h >>> 19);
    h = (h + 0x165667b1) >>> 0;
  }
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return h >>> 0;
}

/**
 * A small, fast, seedable PRNG (mulberry32).
 * Not cryptographic — chosen for speed and reproducibility.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    // Ensure a non-trivial, unsigned 32-bit starting state.
    this.state = (seed >>> 0) || 0x1a2b3c4d;
  }

  /** Fork a child RNG deterministically from this one plus a salt. */
  static from(...seeds: (number | string)[]): Rng {
    let h = 0;
    for (const s of seeds) {
      h = combineSeeds(h, typeof s === 'string' ? hashString(s) : s >>> 0);
    }
    return new Rng(h);
  }

  /** Next float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Float in [min, max). */
  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.float(min, max + 1));
  }

  /** True with the given probability (0..1). */
  bool(probability = 0.5): boolean {
    return this.next() < probability;
  }

  /** Pick a uniformly random element from a non-empty array. */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick: empty array');
    return items[Math.floor(this.next() * items.length)]!;
  }

  /**
   * Approximate a normal distribution (mean, standard deviation) via the
   * Box–Muller transform. Handy for natural-looking planet/star properties.
   */
  gaussian(mean = 0, stdDev = 1): number {
    let u = 0;
    let v = 0;
    while (u === 0) u = this.next();
    while (v === 0) v = this.next();
    const mag = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return mean + mag * stdDev;
  }

  /** Weighted pick: returns the index chosen proportionally to `weights`. */
  weightedIndex(weights: readonly number[]): number {
    let total = 0;
    for (const w of weights) total += w;
    let r = this.next() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i]!;
      if (r <= 0) return i;
    }
    return weights.length - 1;
  }
}
