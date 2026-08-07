/**
 * Shared spatial-grid constant. Kept in its own tiny module so both the star
 * field and the edits layer can reference the chunk size without importing
 * each other (which would create a cycle).
 */
export const STAR_CHUNK_SIZE = 1600;

export function chunkOf(x: number, y: number): { cx: number; cy: number } {
  return { cx: Math.floor(x / STAR_CHUNK_SIZE), cy: Math.floor(y / STAR_CHUNK_SIZE) };
}
