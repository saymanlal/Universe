/**
 * Compact number formatting for coordinate labels and HUD readouts.
 * e.g. 0 -> "0", 1500 -> "1.5k", 2_400_000 -> "2.4M", -3.2e9 -> "-3.2G".
 */
const UNITS: [number, string][] = [
  [1e12, 'T'],
  [1e9, 'G'],
  [1e6, 'M'],
  [1e3, 'k'],
];

/** Julian year in seconds — the sim clock's canonical year length. */
export const YEAR_SECONDS = 31_557_600;

/** Format simulation seconds as a compact "Y# · D# · ##h" clock. */
export function formatSimTime(seconds: number): string {
  const y = Math.floor(seconds / YEAR_SECONDS);
  const d = Math.floor((seconds % YEAR_SECONDS) / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  return `Y${formatCompact(y)} · D${d} · ${String(h).padStart(2, '0')}h`;
}

export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return '∞';
  const abs = Math.abs(value);
  if (abs < 1000) {
    // Keep small numbers readable without noisy decimals.
    return Number.isInteger(value) ? String(value) : value.toFixed(abs < 10 ? 2 : 0);
  }
  for (const [factor, suffix] of UNITS) {
    if (abs >= factor) {
      const scaled = value / factor;
      const str = Math.abs(scaled) >= 100 ? scaled.toFixed(0) : scaled.toFixed(1);
      return `${str.replace(/\.0$/, '')}${suffix}`;
    }
  }
  return String(Math.round(value));
}
