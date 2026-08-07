# Universe Engine

A research-grade **2D deterministic universe simulator**. From a single "God Mode"
workspace you can observe, create, and experiment with entire universes — where
every star, galaxy, planet, and (in later phases) civilization is *generated from
seeds on demand* rather than stored.

> **100% frontend.** No backend, no database server, no cloud, no auth, no paid
> APIs. Everything runs in the browser and persists to IndexedDB. Deploys to
> Vercel Free as a static site.

---

## Tech stack

| Concern            | Choice                        |
| ------------------ | ----------------------------- |
| UI framework       | React 18 + TypeScript         |
| Build tool         | Vite 6                        |
| Rendering          | PixiJS 8 (WebGL)              |
| State              | Zustand                       |
| Persistence        | IndexedDB via Dexie           |
| Animation          | Framer Motion                 |
| Styling            | Tailwind CSS (dark theme)     |
| Background compute | Web Workers (added in later phases) |

## Core design

The universe is **deterministic**. It is a pure function of:

- **Universe Seed** — the physical cosmos.
- **Timeline Seed** — the branch of history.
- **Simulation Time** — how far the clock has advanced.
- **Timeline Events** — the administrator's deliberate edits.

Nothing large is ever stored. Cosmic structure is generated lazily for the
*visible area only* (see `src/canvas/Renderer.ts` — the chunked starfield is the
first demonstration of this). Only permanent, administrator-made changes are
persisted.

## Getting started

```bash
npm install
npm run dev        # start the dev server
npm run build      # type-check + production build to dist/
npm run preview    # preview the production build
```

## Deploying to Vercel Free

The repo ships with `vercel.json`. Import the project in Vercel and deploy — no
environment variables, no server functions, no configuration required. Vercel
auto-detects Vite; the included config pins `framework: vite`, the build command,
and a SPA rewrite so client-side routing works on refresh.

## Project phases

This project is built in 40 incremental phases. Each phase compiles, ships a
working demo, and *extends* previous work rather than rewriting it. See
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the module map and
[`docs/PHASES.md`](docs/PHASES.md) for phase-by-phase status.

**Current status: Phase 5 complete** — everything from Phases 1–4 plus
deterministic **galaxy generation** with clusters and voids, three galaxy types
with distinct visuals, star density shaped by galactic structure, **LOD zoom
transitions** that crossfade between galaxies and stars, galaxy statistics, and
a live "current region" readout.
