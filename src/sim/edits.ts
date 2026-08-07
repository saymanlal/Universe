import { Rng, combineSeeds, hashString } from '@/core/rng';
import { generateStar, type Star } from '@/sim/star';
import { STAR_CHUNK_SIZE, chunkOf } from '@/sim/grid';
import { createId } from '@/core/ids';

/**
 * The administrator's edit layer over the procedural cosmos.
 *
 * The universe is generated from seeds and never stored — so God-Mode
 * mutations are modelled as a small, persisted *overrides* layer that the
 * generators consult:
 *   - Spawned stars: fully admin-defined `Star` objects (id prefix `SX:`).
 *   - Deletions: ids of procedural (or spawned) stars that are hidden.
 *
 * This module holds the in-memory index for the *active* universe (rebuilt by
 * the edits store from IndexedDB). The star field reads it via `isDeleted` and
 * `spawnsForChunk`, so spawn/delete/move/clone automatically flow through
 * rendering, selection and search.
 */

export const SPAWN_PREFIX = 'SX:';

export function isSpawnedId(id: string): boolean {
  return id.startsWith(SPAWN_PREFIX);
}

// ---- active-universe index ------------------------------------------------

let deletedSet = new Set<string>();
const spawnsById = new Map<string, Star>();
const spawnsByChunk = new Map<string, Star[]>();

function chunkKey(cx: number, cy: number): string {
  return `${cx},${cy}`;
}

/** Rebuild the in-memory index from the active universe's persisted edits. */
export function setActiveEdits(spawns: Star[], deletions: string[]): void {
  deletedSet = new Set(deletions);
  spawnsById.clear();
  spawnsByChunk.clear();
  for (const s of spawns) {
    spawnsById.set(s.id, s);
    const key = chunkKey(s.chunk.cx, s.chunk.cy);
    const bucket = spawnsByChunk.get(key);
    if (bucket) bucket.push(s);
    else spawnsByChunk.set(key, [s]);
  }
}

export function clearActiveEdits(): void {
  setActiveEdits([], []);
}

export function isDeleted(id: string): boolean {
  return deletedSet.has(id);
}

export function spawnsForChunk(cx: number, cy: number): Star[] {
  return spawnsByChunk.get(chunkKey(cx, cy)) ?? [];
}

export function getSpawnById(id: string): Star | undefined {
  return spawnsById.get(id);
}

// ---- constructing spawned stars ------------------------------------------

/**
 * Build a plausible spawned star at a world position. Physical properties are
 * borrowed from the procedural generator (seeded by the edit id, so a given
 * spawn is itself reproducible) but position and id are administrator-owned.
 */
export function makeSpawnedStar(
  universeSeed: number,
  x: number,
  y: number,
  name?: string,
): Star {
  const editId = createId('spawn');
  const seed = combineSeeds(universeSeed, hashString(editId));
  const base = generateStar(seed, 0, 0, 0, STAR_CHUNK_SIZE);
  const { cx, cy } = chunkOf(x, y);
  return {
    ...base,
    id: `${SPAWN_PREFIX}${editId}`,
    name: name && name.trim() !== '' ? name.trim() : (base.name ?? base.designation),
    x,
    y,
    chunk: { cx, cy, i: 0 },
  };
}

/** Copy an existing star into a new spawned star at a position (for cloning). */
export function cloneStarAt(source: Star, x: number, y: number): Star {
  const editId = createId('spawn');
  const { cx, cy } = chunkOf(x, y);
  return {
    ...source,
    id: `${SPAWN_PREFIX}${editId}`,
    name: source.name ? `${source.name} copy` : source.designation,
    x,
    y,
    chunk: { cx, cy, i: 0 },
  };
}

/** Re-home a spawned star to a new position (returns a new object). */
export function repositionSpawn(star: Star, x: number, y: number): Star {
  const { cx, cy } = chunkOf(x, y);
  return { ...star, x, y, chunk: { cx, cy, i: 0 } };
}

/** Small deterministic-ish spatial jitter used when cloning many at once. */
export function jitter(seed: number, i: number, amount: number): { dx: number; dy: number } {
  const rng = new Rng(combineSeeds(seed, i, 0x0ffe));
  return { dx: rng.float(-amount, amount), dy: rng.float(-amount, amount) };
}
