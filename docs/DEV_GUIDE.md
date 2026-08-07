# Universe Engine Developer Guide

Welcome to the **Developer & Contributor Guide** for Universe Engine.

---

## Local Development Setup

### Prerequisites

- Node.js 18+ or 20+
- npm 9+

### Commands

```bash
# Install dependencies
npm install

# Start local dev server (Vite)
npm run dev

# Run production TypeScript build check + Vite build
npm run build

# Preview local production build
npm run preview
```

---

## Code Architecture Rules

1. **Frontend Only**: Never introduce backends, serverless functions, database servers, or cloud storage.
2. **Deterministic Core**: All cosmic object generation must be pure functions of `seed` and `simTime`. Never use `Math.random()` or `Date.now()` inside procedural generators.
3. **Lazy Generation**: Generate stars, planets, and civilizations on demand based on viewport bounds. Never store millions of procedural objects in memory or storage.
4. **Extend, Never Rewrite**: Always extend existing store methods and domain types; never break API contracts of earlier phases.

---

## Directory Structure

```
src/
├── canvas/         # PixiJS WebGL viewport, chunk renderer, radar mini-map
├── components/     # Reusable UI controls, icons, toasts, boot screen
├── core/           # Deterministic PRNG, hashing, ID generation, import/export, plugin API
├── db/             # IndexedDB persistence layer (Dexie)
├── layout/         # Dock layout, toolbar, status bar, resize handles
├── panels/         # Outliner, Inspector, God Panel, Search, Timeline, Manager, Plugins
├── sim/            # Cosmic generators: stars, galaxies, planets, chemistry, life, civs, history
├── state/          # Zustand stores for state management
└── workers/        # Web Workers for async background simulation calculations
```

---

## Deploying to Vercel Free

Universe Engine builds into a static SPA inside the `dist/` directory.

1. Connect your repository to Vercel.
2. Build command: `npm run build`
3. Output directory: `dist`
4. Deploy as a static web project (100% client-side execution).
