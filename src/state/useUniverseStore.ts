import { create } from 'zustand';
import type { Camera, Selection, TimeState, Universe } from '@/core/types';
import { createId } from '@/core/ids';
import { hashString, parseSeedInput } from '@/core/rng';
import {
  db,
  deleteUniverseRecord,
  listUniverses,
  saveUniverse,
  getSetting,
  setSetting,
  type Snapshot,
} from '@/db/database';

const ACTIVE_KEY = 'activeUniverseId';

let autosaveTimer: ReturnType<typeof setTimeout> | null = null;

interface UniverseState {
  universes: Universe[];
  activeId: string | null;
  camera: Camera;
  time: TimeState;
  selection: Selection | null;
  loading: boolean;

  // lifecycle
  init: () => Promise<void>;

  // universe CRUD
  createUniverse: (name?: string, seedText?: string) => Promise<Universe>;
  deleteUniverse: (id: string) => Promise<void>;
  renameUniverse: (id: string, name: string) => Promise<void>;
  setDescription: (id: string, description: string) => Promise<void>;
  duplicateUniverse: (id: string) => Promise<Universe | null>;
  setActive: (id: string | null) => Promise<void>;

  // experiments (foundations for Phase 28 timeline branching)
  branchTimeline: (id: string) => Promise<Universe | null>;
  captureSnapshot: (label?: string) => Promise<void>;

  // viewport + time (foundations for Phase 2 / Phase 8)
  setCamera: (camera: Partial<Camera>) => void;
  setTime: (time: Partial<TimeState>) => void;
  /** Advance the active universe's simulation clock by `dt` sim-seconds. */
  advanceTime: (dt: number) => void;
  setSelection: (selection: Selection | null) => void;

  // derived
  active: () => Universe | null;
}

const DEFAULT_CAMERA: Camera = { x: 0, y: 0, zoom: 1 };
const DEFAULT_TIME: TimeState = { paused: true, speed: 1 };

/** Debounced autosave so rapid edits don't hammer IndexedDB. */
function scheduleAutosave(get: () => UniverseState) {
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    const u = get().active();
    if (u) void saveUniverse(u);
  }, 400);
}

function formatSimTimeShort(seconds: number): string {
  const y = Math.floor(seconds / 31557600);
  const d = Math.floor((seconds % 31557600) / 86400);
  return `Y${y}·D${d}`;
}

function seedFromText(text: string | undefined): number {
  return parseSeedInput(text ?? '') ?? hashString(createId('seed'));
}

export const useUniverseStore = create<UniverseState>((set, get) => ({
  universes: [],
  activeId: null,
  camera: { ...DEFAULT_CAMERA },
  time: { ...DEFAULT_TIME },
  selection: null,
  loading: true,

  init: async () => {
    set({ loading: true });
    const [universes, activeId] = await Promise.all([
      listUniverses(),
      getSetting<string | null>(ACTIVE_KEY, null),
    ]);
    const resolvedActive = activeId && universes.some((u) => u.id === activeId)
      ? activeId
      : universes[0]?.id ?? null;
    set({ universes, activeId: resolvedActive, loading: false });
  },

  createUniverse: async (name, seedText) => {
    const now = Date.now();
    const displayName = (name ?? '').trim() || `Universe ${get().universes.length + 1}`;
    const universe: Universe = {
      id: createId('uni'),
      name: displayName,
      seed: seedFromText(seedText),
      timelineSeed: hashString(createId('timeline')),
      simTime: 0,
      createdAt: now,
      updatedAt: now,
    };
    await saveUniverse(universe);
    await setSetting(ACTIVE_KEY, universe.id);
    set((s) => ({
      universes: [universe, ...s.universes],
      activeId: universe.id,
      camera: { ...DEFAULT_CAMERA },
      time: { ...DEFAULT_TIME },
      selection: null,
    }));
    return universe;
  },

  deleteUniverse: async (id) => {
    await deleteUniverseRecord(id);
    set((s) => {
      const universes = s.universes.filter((u) => u.id !== id);
      const activeId = s.activeId === id ? (universes[0]?.id ?? null) : s.activeId;
      return { universes, activeId };
    });
    await setSetting(ACTIVE_KEY, get().activeId);
  },

  renameUniverse: async (id, name) => {
    const trimmed = name.trim();
    if (trimmed === '') return;
    const now = Date.now();
    set((s) => ({
      universes: s.universes.map((u) =>
        u.id === id ? { ...u, name: trimmed, updatedAt: now } : u,
      ),
    }));
    const u = get().universes.find((x) => x.id === id);
    if (u) await saveUniverse(u);
  },

  setDescription: async (id, description) => {
    const now = Date.now();
    set((s) => ({
      universes: s.universes.map((u) =>
        u.id === id ? { ...u, description, updatedAt: now } : u,
      ),
    }));
    const u = get().universes.find((x) => x.id === id);
    if (u) await saveUniverse(u);
  },

  duplicateUniverse: async (id) => {
    const source = get().universes.find((u) => u.id === id);
    if (!source) return null;
    const now = Date.now();
    // A full copy: identical cosmos AND timeline, independent record.
    const copy: Universe = {
      ...source,
      id: createId('uni'),
      name: `${source.name} (copy)`,
      createdAt: now,
      updatedAt: now,
    };
    await saveUniverse(copy);
    set((s) => ({ universes: [copy, ...s.universes] }));
    return copy;
  },

  setActive: async (id) => {
    set({
      activeId: id,
      camera: { ...DEFAULT_CAMERA },
      time: { ...DEFAULT_TIME },
      selection: null,
    });
    await setSetting(ACTIVE_KEY, id);
  },

  branchTimeline: async (id) => {
    const source = get().universes.find((u) => u.id === id);
    if (!source) return null;
    const now = Date.now();
    const branch: Universe = {
      ...source,
      id: createId('uni'),
      name: `${source.name} (branch)`,
      // Same cosmos seed → same physical universe, but a divergent timeline.
      timelineSeed: hashString(createId('timeline')),
      createdAt: now,
      updatedAt: now,
    };
    await saveUniverse(branch);
    await setSetting(ACTIVE_KEY, branch.id);
    set((s) => ({
      universes: [branch, ...s.universes],
      activeId: branch.id,
      selection: null,
    }));
    return branch;
  },

  captureSnapshot: async (label) => {
    const u = get().active();
    if (!u) return;
    const snapshot: Snapshot = {
      id: createId('snap'),
      universeId: u.id,
      label: (label ?? '').trim() || `Snapshot @ ${formatSimTimeShort(u.simTime)}`,
      createdAt: Date.now(),
      universe: { ...u },
    };
    await db.snapshots.put(snapshot);
  },

  setCamera: (camera) => {
    set((s) => ({ camera: { ...s.camera, ...camera } }));
  },

  setTime: (time) => {
    set((s) => ({ time: { ...s.time, ...time } }));
  },

  advanceTime: (dt) => {
    if (dt <= 0) return;
    const { activeId } = get();
    if (!activeId) return;
    set((s) => ({
      universes: s.universes.map((u) =>
        u.id === activeId ? { ...u, simTime: u.simTime + dt, updatedAt: Date.now() } : u,
      ),
    }));
  },

  setSelection: (selection) => set({ selection }),

  active: () => {
    const { activeId, universes } = get();
    return universes.find((u) => u.id === activeId) ?? null;
  },
}));

// Expose db for debugging in dev without importing everywhere.
if (import.meta.env.DEV) {
  (window as unknown as { __ueDb?: typeof db }).__ueDb = db;
}

// Keep autosave wired to time/sim changes made elsewhere.
useUniverseStore.subscribe(() => scheduleAutosave(useUniverseStore.getState));
