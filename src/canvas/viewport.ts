/**
 * Shared viewport constants for the camera and level-of-detail (LOD) system.
 * Kept separate from the (heavy) Renderer so lightweight UI (overlay buttons)
 * can share the same limits without importing PixiJS.
 */

/** Zoom bounds. The very low minimum lets the camera pull back to see whole
 *  galaxies and clusters; the maximum resolves individual stars. */
export const ZOOM_MIN = 0.0004;
export const ZOOM_MAX = 24;

/**
 * LOD crossfade band (in zoom units) between the galaxy view and the star
 * view. Below LO: only galaxy blobs. Above HI: only stars. In between the two
 * layers crossfade for a smooth zoom transition.
 */
export const LOD_LO = 0.012;
export const LOD_HI = 0.045;

export function clampZoom(zoom: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

/** Smooth 0→1 ramp across the LOD band; 1 = full star detail. */
export function starDetail(zoom: number): number {
  if (zoom <= LOD_LO) return 0;
  if (zoom >= LOD_HI) return 1;
  const t = (zoom - LOD_LO) / (LOD_HI - LOD_LO);
  return t * t * (3 - 2 * t); // smoothstep
}
