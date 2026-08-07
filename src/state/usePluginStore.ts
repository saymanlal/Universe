/**
 * Zustand store for the Universe Engine plugin registry.
 *
 * Holds the list of registered plugins and their activation state.
 * Plugin modules are lazy-loaded so the core bundle stays lean.
 */
import { create } from 'zustand';
import {
  createPluginAPI,
  type PluginDescriptor,
  type PluginEntry,
} from '@/core/plugin';

interface PluginState {
  plugins: PluginEntry[];

  /**
   * Register a plugin descriptor.  Does not activate it.
   * Safe to call multiple times — duplicate ids are ignored.
   */
  register: (descriptor: PluginDescriptor) => void;

  /** Activate a registered plugin by id. */
  activate: (id: string) => Promise<void>;

  /** Deactivate a registered plugin by id. */
  deactivate: (id: string) => Promise<void>;

  /** Toggle activation state. */
  toggle: (id: string) => Promise<void>;

  /** Unregister and deactivate a plugin. */
  unregister: (id: string) => Promise<void>;
}

export const usePluginStore = create<PluginState>((set, get) => ({
  plugins: [],

  register(descriptor) {
    set((s) => {
      if (s.plugins.some((p) => p.descriptor.id === descriptor.id)) return s;
      const entry: PluginEntry = {
        descriptor,
        instance: null,
        active: false,
        error: null,
      };
      return { plugins: [...s.plugins, entry] };
    });
  },

  async activate(id) {
    const entry = get().plugins.find((p) => p.descriptor.id === id);
    if (!entry || entry.active) return;

    try {
      const api = createPluginAPI(id);
      const instance = await Promise.resolve(entry.descriptor.activate(api));
      set((s) => ({
        plugins: s.plugins.map((p) =>
          p.descriptor.id === id
            ? { ...p, instance, active: true, error: null }
            : p,
        ),
      }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      set((s) => ({
        plugins: s.plugins.map((p) =>
          p.descriptor.id === id ? { ...p, active: false, error: msg } : p,
        ),
      }));
    }
  },

  async deactivate(id) {
    const entry = get().plugins.find((p) => p.descriptor.id === id);
    if (!entry || !entry.active) return;

    try {
      await entry.instance?.deactivate?.();
    } catch { /* ignore deactivation errors */ }

    set((s) => ({
      plugins: s.plugins.map((p) =>
        p.descriptor.id === id
          ? { ...p, instance: null, active: false, error: null }
          : p,
      ),
    }));
  },

  async toggle(id) {
    const entry = get().plugins.find((p) => p.descriptor.id === id);
    if (!entry) return;
    if (entry.active) await get().deactivate(id);
    else await get().activate(id);
  },

  async unregister(id) {
    await get().deactivate(id);
    set((s) => ({ plugins: s.plugins.filter((p) => p.descriptor.id !== id) }));
  },
}));
