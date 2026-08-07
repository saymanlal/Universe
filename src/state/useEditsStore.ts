import { create } from 'zustand';
import type { Star } from '@/sim/star';
import {
  setActiveEdits,
  clearActiveEdits,
  makeSpawnedStar,
  cloneStarAt,
  repositionSpawn,
  isSpawnedId,
  jitter,
} from '@/sim/edits';
import { findStarById, clearStarCache } from '@/sim/starfield';
import { listEdits, putEdit, deleteEdit } from '@/db/database';

/** A reversible God-Mode action for the undo/redo stacks. */
interface Command {
  label: string;
  redo: () => Promise<void>;
  undo: () => Promise<void>;
}

interface EditsState {
  universeId: string | null;
  spawns: Star[];
  deletions: string[];
  /** Bumped whenever the edit set changes, so the renderer can refresh. */
  version: number;
  undoStack: Command[];
  redoStack: Command[];

  loadForUniverse: (universeId: string | null) => Promise<void>;

  spawnStarAt: (universeSeed: number, x: number, y: number, name?: string) => Star | null;
  deleteStars: (ids: string[]) => void;
  cloneStars: (ids: string[], universeSeed: number) => Star[];
  moveStarTo: (id: string, x: number, y: number) => Star | null;

  undo: () => void;
  redo: () => void;
}

const delRowId = (targetId: string) => `del:${targetId}`;

export const useEditsStore = create<EditsState>((set, get) => {
  // ---- low-level primitives (in-memory index + IndexedDB + refresh) ----

  function reindex() {
    const { spawns, deletions } = get();
    setActiveEdits(spawns, deletions);
    set((s) => ({ version: s.version + 1 }));
  }

  async function addSpawn(star: Star) {
    const uid = get().universeId;
    set((s) => ({ spawns: [...s.spawns, star] }));
    reindex();
    if (uid) await putEdit({ id: star.id, universeId: uid, kind: 'spawn', star });
  }

  async function removeSpawn(id: string) {
    set((s) => ({ spawns: s.spawns.filter((x) => x.id !== id) }));
    reindex();
    await deleteEdit(id);
  }

  async function replaceSpawn(star: Star) {
    const uid = get().universeId;
    set((s) => ({ spawns: s.spawns.map((x) => (x.id === star.id ? star : x)) }));
    reindex();
    if (uid) await putEdit({ id: star.id, universeId: uid, kind: 'spawn', star });
  }

  async function addDeletion(targetId: string) {
    const uid = get().universeId;
    set((s) => ({ deletions: [...s.deletions, targetId] }));
    reindex();
    if (uid) await putEdit({ id: delRowId(targetId), universeId: uid, kind: 'delete', targetId });
  }

  async function removeDeletion(targetId: string) {
    set((s) => ({ deletions: s.deletions.filter((x) => x !== targetId) }));
    reindex();
    await deleteEdit(delRowId(targetId));
  }

  function run(cmd: Command) {
    void cmd.redo();
    set((s) => ({ undoStack: [...s.undoStack, cmd], redoStack: [] }));
  }

  return {
    universeId: null,
    spawns: [],
    deletions: [],
    version: 0,
    undoStack: [],
    redoStack: [],

    loadForUniverse: async (universeId) => {
      set({ universeId, undoStack: [], redoStack: [] });
      if (!universeId) {
        clearActiveEdits();
        clearStarCache();
        set((s) => ({ spawns: [], deletions: [], version: s.version + 1 }));
        return;
      }
      const rows = await listEdits(universeId);
      const spawns: Star[] = [];
      const deletions: string[] = [];
      for (const r of rows) {
        if (r.kind === 'spawn' && r.star) spawns.push(r.star);
        else if (r.kind === 'delete' && r.targetId) deletions.push(r.targetId);
      }
      set({ spawns, deletions });
      setActiveEdits(spawns, deletions);
      clearStarCache();
      set((s) => ({ version: s.version + 1 }));
    },

    spawnStarAt: (universeSeed, x, y, name) => {
      if (!get().universeId) return null;
      const star = makeSpawnedStar(universeSeed, x, y, name);
      run({
        label: 'Spawn star',
        redo: () => addSpawn(star),
        undo: () => removeSpawn(star.id),
      });
      return star;
    },

    deleteStars: (ids) => {
      const targets = ids.map((id) => findStarById(id)).filter((s): s is Star => s !== null);
      if (targets.length === 0) return;
      run({
        label: `Delete ${targets.length} star(s)`,
        redo: async () => {
          for (const s of targets) {
            if (isSpawnedId(s.id)) await removeSpawn(s.id);
            else await addDeletion(s.id);
          }
        },
        undo: async () => {
          for (const s of targets) {
            if (isSpawnedId(s.id)) await addSpawn(s);
            else await removeDeletion(s.id);
          }
        },
      });
    },

    cloneStars: (ids, universeSeed) => {
      const sources = ids.map((id) => findStarById(id)).filter((s): s is Star => s !== null);
      if (sources.length === 0) return [];
      const clones = sources.map((s, i) => {
        const { dx, dy } = jitter(universeSeed, i + 1, 40);
        return cloneStarAt(s, s.x + dx + 20, s.y + dy + 20);
      });
      run({
        label: `Clone ${clones.length} star(s)`,
        redo: async () => {
          for (const c of clones) await addSpawn(c);
        },
        undo: async () => {
          for (const c of clones) await removeSpawn(c.id);
        },
      });
      return clones;
    },

    moveStarTo: (id, x, y) => {
      const star = findStarById(id);
      if (!star) return null;

      if (isSpawnedId(star.id)) {
        const oldStar = star;
        const newStar = repositionSpawn(star, x, y);
        run({
          label: 'Move star',
          redo: () => replaceSpawn(newStar),
          undo: () => replaceSpawn(oldStar),
        });
        return newStar;
      }

      // Procedural star: convert to a spawned copy at the new position and hide
      // the original (so it can be freely repositioned thereafter).
      const copy = { ...cloneStarAt(star, x, y), name: star.name ?? star.designation };
      run({
        label: 'Move star',
        redo: async () => {
          await addDeletion(star.id);
          await addSpawn(copy);
        },
        undo: async () => {
          await removeSpawn(copy.id);
          await removeDeletion(star.id);
        },
      });
      return copy;
    },

    undo: () => {
      const { undoStack } = get();
      const cmd = undoStack[undoStack.length - 1];
      if (!cmd) return;
      void cmd.undo();
      set((s) => ({
        undoStack: s.undoStack.slice(0, -1),
        redoStack: [...s.redoStack, cmd],
      }));
    },

    redo: () => {
      const { redoStack } = get();
      const cmd = redoStack[redoStack.length - 1];
      if (!cmd) return;
      void cmd.redo();
      set((s) => ({
        redoStack: s.redoStack.slice(0, -1),
        undoStack: [...s.undoStack, cmd],
      }));
    },
  };
});
