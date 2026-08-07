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
