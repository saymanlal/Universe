import { Rng, combineSeeds } from '@/core/rng';

/**
 * Procedural, fully deterministic star generation.
 *
 * A star is never stored — it is a pure function of the universe seed and its
 * grid position (chunk coordinates + index). Regenerating the same inputs
 * always yields the identical star, which is what makes the cosmos both
 * infinite and reproducible.
 */

export type CelestialCategory = 'star' | 'black_hole' | 'neutron_star' | 'pulsar' | 'quasar';

export type SpectralClass = 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M' | 'BH' | 'NS' | 'PSR' | 'QSR';

export interface Star {
  /** Stable id encoding universe seed + grid position: `S:seed:cx:cy:i`. */
  id: string;
  category: CelestialCategory;
  /** Proper name for notable stars, else null. */
  name: string | null;
  /** Catalog designation (always present). */
  designation: string;
  /** World-space position. */
  x: number;
  y: number;
  spectral: SpectralClass;
  subclass: number; // 0–9 (0 = hottest within class)
  temperature: number; // Kelvin
  mass: number; // solar masses
  radius: number; // solar radii
  luminosity: number; // solar luminosities
  /** Packed 0xRRGGBB display color derived from temperature. */
  color: number;
  /** Baseline draw radius in world units. */
  renderRadius: number;
  chunk: { cx: number; cy: number; i: number };
  /** Exotic properties for relativistic / accretion effects */
  accretionDiskAngle?: number;
  magneticFieldStrength?: number;
}

interface ClassDef {
  cls: SpectralClass;
  weight: number; // relative frequency (roughly the real IMF, M-dominated)
  temp: [number, number];
  mass: [number, number];
  radius: [number, number];
}

// Ordered hottest → coolest. Weights approximate the stellar mass function.
const CLASSES: ClassDef[] = [
  { cls: 'O', weight: 0.02, temp: [30000, 50000], mass: [16, 90], radius: [6.6, 20] },
  { cls: 'B', weight: 0.4, temp: [10000, 30000], mass: [2.1, 16], radius: [1.8, 6.6] },
  { cls: 'A', weight: 1.2, temp: [7500, 10000], mass: [1.4, 2.1], radius: [1.4, 1.8] },
  { cls: 'F', weight: 4, temp: [6000, 7500], mass: [1.04, 1.4], radius: [1.15, 1.4] },
  { cls: 'G', weight: 8, temp: [5200, 6000], mass: [0.8, 1.04], radius: [0.96, 1.15] },
  { cls: 'K', weight: 15, temp: [3700, 5200], mass: [0.45, 0.8], radius: [0.7, 0.96] },
  { cls: 'M', weight: 71, temp: [2400, 3700], mass: [0.08, 0.45], radius: [0.1, 0.7] },
];
const CLASS_WEIGHTS = CLASSES.map((c) => c.weight);

// Pronounceable name fragments for notable stars.
const NAME_PREFIX = ['Al', 'Bel', 'Cor', 'Den', 'El', 'Fom', 'Gal', 'Hyd', 'Kor', 'Lyr', 'Men', 'Naz', 'Ophi', 'Pol', 'Rig', 'Sir', 'Tar', 'Vega', 'Xan', 'Zar'];
const NAME_MID = ['a', 'e', 'i', 'o', 'ae', 'ei', 'ou', 'ara', 'eno', 'ith', 'oro', 'ura'];
const NAME_SUFFIX = ['nis', 'ron', 'tak', 'lux', 'mar', 'phe', 'dus', 'ven', 'gor', 'sei', 'tia', 'lon'];
const GREEK = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa'];

/**
 * Approximate blackbody colour for a temperature (K), returned as 0xRRGGBB.
 * A compact fit good enough for visualisation across ~2000–40000 K.
 */
export function temperatureToColor(kelvin: number): number {
  const t = Math.max(1000, Math.min(40000, kelvin)) / 100;
  let r: number;
  let g: number;
  let b: number;

  if (t <= 66) {
    r = 255;
    g = 99.47 * Math.log(t) - 161.12;
  } else {
    r = 329.7 * Math.pow(t - 60, -0.1332);
    g = 288.12 * Math.pow(t - 60, -0.0755);
  }
  if (t >= 66) {
    b = 255;
  } else if (t <= 19) {
    b = 0;
  } else {
    b = 138.52 * Math.log(t - 10) - 305.04;
  }

  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (clamp(r) << 16) | (clamp(g) << 8) | clamp(b);
}

/** Human-readable spectral type, e.g. "G2 V". */
export function spectralType(star: Star): string {
  return `${star.spectral}${star.subclass} V`;
}

function makeName(rng: Rng): string {
  const prefix = rng.pick(NAME_PREFIX);
  const useMid = rng.bool(0.6);
  const mid = useMid ? rng.pick(NAME_MID) : '';
  const suffix = rng.pick(NAME_SUFFIX);
  let name = `${prefix}${mid}${suffix}`;
  // Occasionally add a Bayer-style Greek designation for flavour.
  if (rng.bool(0.35)) name = `${rng.pick(GREEK)} ${name}`;
  return name;
}

/**
 * Generate the i-th star of chunk (cx, cy) for the given universe seed.
 * Deterministic: every RNG draw happens in a fixed order.
 */
export function generateStar(
  seed: number,
  cx: number,
  cy: number,
  i: number,
  chunkSize: number,
): Star {
  const rng = new Rng(combineSeeds(seed, cx, cy, i * 0x9e37 + 0x1234));

  // Position within the chunk.
  const x = (cx + rng.next()) * chunkSize;
  const y = (cy + rng.next()) * chunkSize;

  const def = CLASSES[rng.weightedIndex(CLASS_WEIGHTS)]!;
  const subclass = rng.int(0, 9);
  // Sub-class 0 is hottest within the band → interpolate the range accordingly.
  const tFrac = 1 - subclass / 10;
  const temperature = Math.round(def.temp[0] + (def.temp[1] - def.temp[0]) * tFrac);
  const mass = +(def.mass[0] + rng.next() * (def.mass[1] - def.mass[0])).toFixed(3);
  const radius = +(def.radius[0] + rng.next() * (def.radius[1] - def.radius[0])).toFixed(3);
  // Stefan–Boltzmann in solar units: L = R² · (T/T☉)⁴, T☉ ≈ 5772 K.
  const luminosity = +(radius * radius * Math.pow(temperature / 5772, 4)).toFixed(3);

  const color = temperatureToColor(temperature);
  const renderRadius = +(1.1 + Math.min(5, Math.log10(1 + luminosity) * 1.6)).toFixed(2);
  const notable = luminosity > 4 || rng.bool(0.06);
  const name = notable ? makeName(rng) : null;
  const catalog = combineSeeds(seed, cx * 73856093, cy * 19349663, i) % 900000 + 100000;
  const designation = `UEC-${catalog}`;

  // Procedural roll for exotic celestial category (black hole, pulsar, neutron star, quasar)
  const exoticRoll = rng.next();
  let category: CelestialCategory = 'star';
  let spectralClass = def.cls;
  let customColor = color;
  let customRadius = renderRadius;
  let accretionAngle: number | undefined = undefined;
  let magField: number | undefined = undefined;

  if (exoticRoll < 0.015) {
    category = 'black_hole';
    spectralClass = 'BH';
    customColor = 0x050510;
    customRadius = 3.5;
    accretionAngle = rng.next() * Math.PI * 2;
  } else if (exoticRoll < 0.035) {
    category = 'pulsar';
    spectralClass = 'PSR';
    customColor = 0x88eeff;
    customRadius = 2.2;
    magField = rng.next() * 1000 + 100;
  } else if (exoticRoll < 0.05) {
    category = 'quasar';
    spectralClass = 'QSR';
    customColor = 0xffaa44;
    customRadius = 4.8;
    accretionAngle = rng.next() * Math.PI * 2;
  } else if (exoticRoll < 0.07) {
    category = 'neutron_star';
    spectralClass = 'NS';
    customColor = 0xbbffff;
    customRadius = 1.8;
  }

  return {
    id: `S:${seed}:${cx}:${cy}:${i}`,
    category,
    name,
    designation,
    x,
    y,
    spectral: spectralClass,
    subclass,
    temperature,
    mass,
    radius,
    luminosity,
    color: customColor,
    renderRadius: customRadius,
    accretionDiskAngle: accretionAngle,
    magneticFieldStrength: magField,
    chunk: { cx, cy, i },
  };
}
