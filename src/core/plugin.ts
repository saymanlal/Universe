/**
 * Universe Engine Plugin Architecture (Phase 38)
 *
 * Plugins are plain ES modules that receive a sandboxed `PluginAPI` object and
 * return a `PluginInstance` (optional cleanup + event hooks).  The registry
 * manages registration, activation, and tear-down.  All plugin state is kept in
 * `usePluginStore` (Zustand) and — when the plugin opts in — persisted to
 * IndexedDB via the existing `kv` table.
 *
 * Design goals:
 * - Zero backend dependency.
 * - Plugins cannot import private store internals; they interact only through
 *   the stable `PluginAPI` surface defined here.
 * - Adding a new plugin never requires touching existing engine code.
 */

import type { Universe, Camera } from '@/core/types';

// ---------------------------------------------------------------------------
// Public API surface exposed to plugins
// ---------------------------------------------------------------------------

export interface PluginAPI {
  /** Read-only snapshot of the currently active universe (or null). */
  getActiveUniverse(): Universe | null;

  /** Read the current camera state. */
  getCamera(): Camera;

  /**
   * Subscribe to simulation ticks.  The callback is called every animation
   * frame while the simulation is running.  Returns an unsubscribe function.
   */
  onTick(cb: (simTime: number, dt: number) => void): () => void;

  /**
   * Subscribe to universe changes (create / delete / switch).
   * Returns an unsubscribe function.
   */
  onUniverseChange(cb: (universe: Universe | null) => void): () => void;

  /**
   * Persist arbitrary JSON data scoped to this plugin.
   * Stored in IndexedDB kv table under the key `plugin:<pluginId>:<key>`.
   */
  persist(key: string, value: unknown): Promise<void>;

  /** Retrieve previously persisted data.  Returns `undefined` if not set. */
  retrieve<T = unknown>(key: string): Promise<T | undefined>;

  /** Log a message tagged with the plugin id (shows in browser console). */
  log(level: 'info' | 'warn' | 'error', ...args: unknown[]): void;
}

// ---------------------------------------------------------------------------
// Plugin descriptor — what authors export from their module
// ---------------------------------------------------------------------------

export interface PluginDescriptor {
  /** Stable, unique identifier for the plugin (e.g. "com.example.my-plugin"). */
  id: string;
  /** Human-readable name shown in the Plugin panel. */
  name: string;
  /** Short description (one sentence). */
  description: string;
  /** Semver version string, e.g. "1.0.0". */
  version: string;
  /** Author name or organisation. */
  author?: string;

  /**
   * Called once when the plugin is activated.  Must return a `PluginInstance`
   * (or a promise that resolves to one).
   */
  activate(api: PluginAPI): PluginInstance | Promise<PluginInstance>;
}

export interface PluginInstance {
  /** Called when the plugin is deactivated or the engine shuts down. */
  deactivate?(): void | Promise<void>;
}

// ---------------------------------------------------------------------------
// Internal registry entry
// ---------------------------------------------------------------------------

export interface PluginEntry {
  descriptor: PluginDescriptor;
  instance: PluginInstance | null;
  active: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// PluginAPI factory — constructs a sandboxed API for one plugin
// ---------------------------------------------------------------------------

import { useUniverseStore } from '@/state/useUniverseStore';
import { db, getSetting, setSetting } from '@/db/database';

/** Subscription list for tick events (shared across all plugin APIs). */
const tickSubs = new Set<(simTime: number, dt: number) => void>();
/** Subscription list for universe-change events. */
const universeSubs = new Set<(u: Universe | null) => void>();

/** Called by the time engine each frame (see useTimeEngine.ts integration). */
export function dispatchTick(simTime: number, dt: number) {
  tickSubs.forEach((cb) => {
    try { cb(simTime, dt); } catch { /* isolate per-plugin errors */ }
  });
}

/** Called by the universe store when the active universe changes. */
export function dispatchUniverseChange(u: Universe | null) {
  universeSubs.forEach((cb) => {
    try { cb(u); } catch { /* isolate */ }
  });
}

export function createPluginAPI(pluginId: string): PluginAPI {
  const kvPrefix = `plugin:${pluginId}:`;
  return {
    getActiveUniverse: () => useUniverseStore.getState().active(),
    getCamera: () => useUniverseStore.getState().camera,

    onTick(cb) {
      tickSubs.add(cb);
      return () => tickSubs.delete(cb);
    },

    onUniverseChange(cb) {
      universeSubs.add(cb);
      return () => universeSubs.delete(cb);
    },

    async persist(key, value) {
      await setSetting(kvPrefix + key, JSON.stringify(value));
    },

    async retrieve<T>(key: string): Promise<T | undefined> {
      const raw = await getSetting<string | null>(kvPrefix + key, null);
      if (raw === null) return undefined;
      try { return JSON.parse(raw) as T; } catch { return undefined; }
    },

    log(level, ...args) {
      const tag = `[Plugin:${pluginId}]`;
      if (level === 'error') console.error(tag, ...args);
      else if (level === 'warn') console.warn(tag, ...args);
      else console.info(tag, ...args);
    },
  };
}

// suppress unused import lint (db is used via db.kv indirectly through setSetting)
void db;
