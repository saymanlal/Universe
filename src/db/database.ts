import Dexie, { type Table } from 'dexie';
import type { Universe } from '@/core/types';
import type { Star } from '@/sim/star';

/**
 * A stored snapshot of a universe at a point in time. Only the record (seeds,
 * simTime, edits) is captured — never the generated cosmos — so snapshots are
 * cheap. Timeline branching (Phase 28) forks from these.
 */
export interface Snapshot {
  id: string;
  universeId: string;
  label: string;
  createdAt: number;
  /** Serialized universe record at capture time. */
  universe: Universe;
}

/** Generic key/value store for engine settings and autosave metadata. */
export interface KeyValue {
  key: string;
  value: unknown;
}

/**
 * A persisted administrator edit (God-Mode override) for a universe.
 * `spawn` carries a full star object; `delete` hides a procedural/spawned star.
 */
export interface EditRow {
  id: string;
  universeId: string;
  kind: 'spawn' | 'delete';
  /** For `spawn`: the spawned star. */
  star?: Star;
  /** For `delete`: the id of the hidden star. */
  targetId?: string;
}

/**
 * The single browser-local database for the whole engine. No backend, no
 * server — everything lives in IndexedDB via Dexie. Later phases add tables
 * here (edits, experiments, history) without altering existing ones.
 */
export class UniverseDatabase extends Dexie {
  universes!: Table<Universe, string>;
  snapshots!: Table<Snapshot, string>;
  kv!: Table<KeyValue, string>;
  edits!: Table<EditRow, string>;

  constructor() {
    super('universe-engine');
    this.version(1).stores({
      universes: 'id, name, updatedAt',
      snapshots: 'id, universeId, createdAt',
      kv: 'key',
    });
    // v2 adds the God-Mode edits layer (spawn/delete overrides per universe).
    this.version(2).stores({
      edits: 'id, universeId, kind',
    });
  }
}

export const db = new UniverseDatabase();

/** Persist (create or overwrite) a universe record. */
export async function saveUniverse(u: Universe): Promise<void> {
  await db.universes.put(u);
}

export async function deleteUniverseRecord(id: string): Promise<void> {
  await db.transaction('rw', db.universes, db.snapshots, db.edits, async () => {
    await db.universes.delete(id);
    await db.snapshots.where('universeId').equals(id).delete();
    await db.edits.where('universeId').equals(id).delete();
  });
}

// ---- God-Mode edits -------------------------------------------------------

export async function listEdits(universeId: string): Promise<EditRow[]> {
  return db.edits.where('universeId').equals(universeId).toArray();
}

export async function putEdit(row: EditRow): Promise<void> {
  await db.edits.put(row);
}

export async function deleteEdit(id: string): Promise<void> {
  await db.edits.delete(id);
}

export async function listUniverses(): Promise<Universe[]> {
  return db.universes.orderBy('updatedAt').reverse().toArray();
}

/** Count snapshots grouped by universe id (for manager cards). */
export async function snapshotCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  await db.snapshots.orderBy('universeId').eachKey((key) => {
    const id = String(key);
    counts[id] = (counts[id] ?? 0) + 1;
  });
  return counts;
}

/** Read a single key/value setting, with a typed fallback. */
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.kv.get(key);
  return row ? (row.value as T) : fallback;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.kv.put({ key, value });
}
