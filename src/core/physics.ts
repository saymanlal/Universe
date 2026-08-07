/**
 * Phase 32 — Physics Editor
 *
 * Defines per-universe physical constants that can be edited in God Mode.
 * Every physics constant feeds into planetary generation, orbital mechanics,
 * star luminosity, and life-probability calculations — so changing them
 * produces a different but fully deterministic cosmos.
 *
 * The defaults below match real-universe values (SI units where practical).
 * Admin overrides are stored in IndexedDB as part of the Universe record;
 * procedural generators read from this module rather than hard-coding values.
 */

export interface PhysicsConstants {
  /** Gravitational constant (N·m²/kg²). Real: 6.674e-11 */
  G: number;
  /** Speed of light (m/s). Real: 2.998e8 */
  c: number;
  /** Planck constant (J·s). Real: 6.626e-34 */
  h: number;
  /** Boltzmann constant (J/K). Real: 1.380e-23 */
  k_B: number;
  /** Stefan–Boltzmann constant (W/m²/K⁴). Real: 5.670e-8 */
  sigma: number;
  /** Fine-structure constant (dimensionless). Real: ~1/137 */
  alpha: number;
  /** Cosmological constant / dark-energy density (1/m²). Real: ~1.11e-52 */
  lambda: number;
  /** Base atmosphere density multiplier (1 = Earth-like) */
  atmosphereDensityScale: number;
  /** Electromagnetic interaction strength multiplier (1 = real universe) */
  emStrength: number;
  /** Nuclear binding force scale (1 = real universe) */
  nuclearScale: number;
}

export const DEFAULT_PHYSICS: Readonly<PhysicsConstants> = {
  G: 6.674e-11,
  c: 2.998e8,
  h: 6.626e-34,
  k_B: 1.380e-23,
  sigma: 5.670e-8,
  alpha: 1 / 137,
  lambda: 1.11e-52,
  atmosphereDensityScale: 1.0,
  emStrength: 1.0,
  nuclearScale: 1.0,
};

/** Clamp-validated merge of admin overrides with safe defaults. */
export function applyPhysicsOverrides(
  overrides: Partial<PhysicsConstants>
): PhysicsConstants {
  return {
    G:                      clamp(overrides.G                      ?? DEFAULT_PHYSICS.G,        1e-20, 1e-5),
    c:                      clamp(overrides.c                      ?? DEFAULT_PHYSICS.c,        1e6,   1e10),
    h:                      clamp(overrides.h                      ?? DEFAULT_PHYSICS.h,        1e-40, 1e-20),
    k_B:                    clamp(overrides.k_B                    ?? DEFAULT_PHYSICS.k_B,      1e-30, 1e-15),
    sigma:                  clamp(overrides.sigma                  ?? DEFAULT_PHYSICS.sigma,    1e-12, 1e-3),
    alpha:                  clamp(overrides.alpha                  ?? DEFAULT_PHYSICS.alpha,    1e-4,  0.5),
    lambda:                 clamp(overrides.lambda                 ?? DEFAULT_PHYSICS.lambda,   0,     1e-40),
    atmosphereDensityScale: clamp(overrides.atmosphereDensityScale ?? 1.0,                      0.01,  100),
    emStrength:             clamp(overrides.emStrength             ?? 1.0,                      0.01,  100),
    nuclearScale:           clamp(overrides.nuclearScale           ?? 1.0,                      0.1,   10),
  };
}

/** Derive a short human-readable label that describes how exotic this physics set is. */
export function physicsEraLabel(p: PhysicsConstants): string {
  const gRatio = p.G / DEFAULT_PHYSICS.G;
  const cRatio = p.c / DEFAULT_PHYSICS.c;
  if (gRatio > 10 && cRatio < 0.1) return 'Dense Slow-Light Universe';
  if (gRatio < 0.1 && p.atmosphereDensityScale > 5) return 'Low-Gravity Thick-Air Universe';
  if (p.emStrength > 5) return 'High-EM Universe';
  if (p.nuclearScale < 0.5) return 'Weak-Force Universe';
  if (p.lambda > 1e-45) return 'Expanding Accelerated Universe';
  return 'Standard-Physics Universe';
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
