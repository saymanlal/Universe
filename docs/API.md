# Universe Engine API Documentation

Welcome to the **Universe Engine Developer API Documentation**. Universe Engine is a research-grade, 2D deterministic universe simulator running entirely in the browser.

---

## Architecture Overview

All cosmic structures (galaxies, star systems, planets, chemical elements, biological evolution, civilizations, economy, politics, and historical events) derive deterministically from procedural seed values and simulation time.

### Core Deterministic Modules

1. **`core/rng.ts`** — `Rng` class (mulberry32 PRNG), `hashString` (MurmurHash3), and `combineSeeds`.
2. **`sim/starfield.ts`** — Region star generation with chunk caching and spatial lookup.
3. **`sim/galaxy.ts`** — Galaxy density noise fields, arm structures, and cluster mapping.
4. **`sim/planet.ts` & `sim/planetProfile.ts`** — Planetary orbits, biomes, atmospheric pressure, mass/gravity, and habitability indices.
5. **`sim/edits.ts`** — Overrides index for God Mode administrator actions (spawns, deletions, moves, clones).

---

## Plugin API (Phase 38)

Universe Engine features a sandboxed, event-driven Plugin API. Plugins run entirely client-side without backend dependencies.

### Registering a Plugin

```typescript
import { usePluginStore } from '@/state/usePluginStore';

usePluginStore.getState().register({
  id: 'org.example.anomaly-detector',
  name: 'Cosmic Anomaly Detector',
  description: 'Scans visible space for supergiant stars.',
  version: '1.0.0',
  author: 'System Admin',

  activate(api) {
    api.log('info', 'Anomaly Detector active');

    // Subscribe to simulation frame ticks
    const unsub = api.onTick((simTime, dt) => {
      const activeUniverse = api.getActiveUniverse();
      if (!activeUniverse) return;
      // Perform tick calculations...
    });

    return {
      deactivate() {
        unsub();
        api.log('info', 'Anomaly Detector deactivated');
      },
    };
  },
});
```

### Plugin API Reference

| Method | Type | Description |
|---|---|---|
| `getActiveUniverse()` | `() => Universe \| null` | Returns the active universe domain object. |
| `getCamera()` | `() => Camera` | Returns the current viewport camera target `(x, y, zoom)`. |
| `onTick(cb)` | `((simTime, dt) => void) => () => void` | Listens to live frame ticks. Returns an unsubscribe function. |
| `onUniverseChange(cb)` | `((u) => void) => () => void` | Listens for active universe switches or updates. |
| `persist(key, val)` | `(key, value) => Promise<void>` | Saves plugin state to IndexedDB key-value storage. |
| `retrieve(key)` | `<T>(key) => Promise<T \| undefined>` | Retrieves plugin state from IndexedDB. |
| `log(level, ...args)` | `('info'\|'warn'\|'error', ...args) => void` | Console logging prefixed with the plugin's ID. |

---

## Database Schema (IndexedDB / Dexie)

Database Name: `UniverseEngineDB`

- **`universes`**: `id, name, seed, timelineSeed, createdAt, updatedAt`
- **`snapshots`**: `id, universeId, label, createdAt`
- **`edits`**: `id, universeId, action, targetId, timestamp`
- **`kv`**: `key` (Key-value configuration store)
