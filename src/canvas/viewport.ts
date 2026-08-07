/**
 * Shared viewport constants for the camera and level-of-detail (LOD) system.
 * Kept separate from the (heavy) Renderer so lightweight UI (overlay buttons)
 * can share the same limits without importing PixiJS.
 */

/** Zoom bounds. Extremely wide range spanning Multiverse to Quantum scale. */
export const ZOOM_MIN = 1e-12;
export const ZOOM_MAX = 1e12;

/**
 * LOD crossfade band (in zoom units) between the galaxy view and the star
 * view. Below LO: only galaxy blobs. Above HI: only stars. In between the two
 * layers crossfade for a smooth zoom transition.
 */
export const LOD_LO = 0.012;
export const LOD_HI = 0.045;

/** Solar-system view band: orbits/planets fade in as you zoom into a star.
 *  Tuned so a whole system (orbits up to ~120 world units) is visible at full
 *  detail around zoom `SYS_FRAME`. */
export const SYS_LO = 1.2;
export const SYS_HI = 3;
/** Zoom used by "Enter/Frame system" actions (whole system in view, full detail). */
export const SYS_FRAME = 3;

export function clampZoom(zoom: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Smooth 0→1 ramp across the LOD band; 1 = full star detail. */
export function starDetail(zoom: number): number {
  if (zoom <= LOD_LO) return 0;
  if (zoom >= LOD_HI) return 1;
  return smoothstep((zoom - LOD_LO) / (LOD_HI - LOD_LO));
}

/** Smooth 0→1 ramp for the solar-system overlay; 1 = full system detail. */
export function systemDetail(zoom: number): number {
  if (zoom <= SYS_LO) return 0;
  if (zoom >= SYS_HI) return 1;
  return smoothstep((zoom - SYS_LO) / (SYS_HI - SYS_LO));
}
