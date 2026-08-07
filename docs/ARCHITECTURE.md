# Architecture

Universe Engine is a single-page, frontend-only application. This document maps
the modules and the principles that keep the codebase modular and extendable
across all 40 phases.

## Guiding principles

1. **Determinism first.** All procedural content derives from seeds via the pure
   RNG in `src/core/rng.ts`. No `Math.random` / `Date.now` inside generation.
2. **Generate, don't store.** Cosmic objects are computed on demand for the
   visible area only. IndexedDB holds *records and edits*, never the generated
   cosmos.
3. **Extend, never rewrite.** Each phase adds modules/tables/panels; existing
   ones keep their contracts.
4. **Cheap by default.** High-frequency data (FPS, cursor, sim clock) lives in
   dedicated stores so it never re-renders heavy consumers.

## Layer map

```
src/
├── core/            Pure, framework-free engine primitives
│   ├── rng.ts       Deterministic PRNG + hashing + seed combination
│   ├── ids.ts       Unique ids for persisted records
│   └── types.ts     Shared domain types (Universe, Camera, Selection…)
│
├── db/              Persistence (no backend)
│   └── database.ts  Dexie/IndexedDB schema + universe/snapshot/kv helpers
│
├── state/           Zustand stores (app state, not rendering)
│   ├── useUniverseStore.ts  Universes, camera, time, selection + autosave
│   ├── useUiStore.ts        Panel visibility + dock widths
│   ├── useStatsStore.ts     Live viewport telemetry (FPS/cursor/objects)
│   └── useTimeEngine.ts     rAF loop advancing the simulation clock
│
├── canvas/          PixiJS rendering
│   ├── Renderer.ts          WebGL app, camera, chunked starfield, grid
│   ├── UniverseCanvas.tsx   React host for the renderer
│   └── ViewportOverlay.tsx  Floating HUD (zoom / home)
│
├── layout/          Workspace shell
│   ├── DockLayout.tsx   Toolbar + resizable docks + viewport + status bar
│   ├── Toolbar.tsx      Brand, time transport, panel toggles
│   ├── StatusBar.tsx    Perf HUD + coordinates + sim clock
│   └── ResizeHandle.tsx Drag-to-resize dock divider
│
├── panels/          Dockable tool panels
│   ├── OutlinerPanel.tsx    Scene tree
│   ├── GodPanel.tsx         God-Mode toolbox
│   ├── InspectorPanel.tsx   Property inspector
│   └── UniverseManager.tsx  Create/switch/delete universes
│
├── components/      Shared presentational pieces (icons, boot, empty states)
└── routes/          React Router entry + workspace route
```

## Data flow

```
IndexedDB (Dexie)  ──init──▶  useUniverseStore  ──subscribe──▶  Renderer (Pixi)
        ▲                          │   ▲                              │
        └────── autosave ──────────┘   └──── React panels ───────────┘
                                             (Zustand selectors)
```

- The **store is the single source of truth** for camera, time, and selection.
- The **Renderer reads the store every tick** and writes camera changes back on
  pan/zoom, so UI controls and direct manipulation stay in sync.
- **Autosave** is debounced in the store and persists only the compact universe
  record.

## Rendering & performance

The `Renderer` implements the project's central performance idea in miniature:
the background starfield is divided into fixed-size world **chunks**. Only chunks
overlapping the viewport are instantiated as Pixi display objects; chunks that
scroll away are destroyed. Chunk contents are deterministic (`combineSeeds(seed,
cx, cy)`), so the same universe always looks identical, and a hard cap prevents
extreme zoom-out from exploding the object count. Galaxies, systems, and entities
in later phases reuse this visible-area, lazy-generation strategy.
