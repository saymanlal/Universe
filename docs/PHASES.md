# Phase Log

Tracks progress across the 40-phase build plan. Each phase compiles, ships a
working demo, and extends (never rewrites) prior work.

## ✅ Phase 1 — Foundation & Dark Workspace

**Goal:** Project setup, folder structure, routing, dark theme, dock layout,
resizable panels, universe canvas, God panel, Vercel-deployable working demo.

**Delivered**

- Vite + React + TypeScript project, path aliases (`@/*`), strict TS.
- Tailwind dark theme (deep-space palette, pro tooling aesthetic).
- React Router shell with a single workspace route + boot screen.
- Deterministic engine core: seeded PRNG, hashing, seed combination (`core/`).
- IndexedDB persistence via Dexie (universes, snapshots, key/value) + autosave.
- Zustand stores: universe/camera/time/selection, UI/docks, live stats.
- PixiJS 8 viewport: pan, zoom-to-cursor, adaptive coordinate grid, and an
  infinite, deterministic, chunked starfield (lazy visible-area generation).
- Dockable workspace: toolbar (time transport + panel toggles), resizable left
  (Outliner) and right (God Tools + Inspector) docks, status bar HUD.
- Universe Manager (create/switch/delete, seed by word or number).
- God Panel: create/delete universe, teleport, branch timeline, snapshot.
- Live simulation clock (play/pause/speed) via a requestAnimationFrame engine.
- Docs: README, ARCHITECTURE, this phase log.

**Verification**

- `npm run build` (tsc project references + Vite) passes with no errors.
- App boots to the workspace, creates/persists universes across reloads,
  pans/zooms smoothly, and holds a high frame rate.
- Deploys to Vercel Free as a static SPA (`vercel.json` included).

---

## ✅ Phase 2 — Infinite Camera, Mini-map & Coordinate Grid

**Goal:** Infinite 2D camera, pan, zoom, mini-map, coordinate grid, smooth
rendering.

**Delivered**

- **Smoothed display camera:** the renderer now eases a display camera toward
  the store target with exponential smoothing (zoom eased in log space), so
  wheel zoom, teleports, and keyboard moves glide. Dragging bypasses easing for
  a 1:1 feel. This is the "smooth rendering" requirement.
- **Keyboard navigation:** WASD / arrow keys pan (speed scales with zoom),
  `+`/`-` zoom, `0`/`Home` recenter to genesis. Ignored while typing in fields.
- **Zoom-to-cursor** now anchors on the displayed camera so the point under the
  pointer stays fixed even mid-ease.
- **Coordinate grid labels:** pooled, screen-space `Text` labels along the top
  and left edges show world coordinates at each grid line (compact k/M/G
  formatting via `core/format.ts`), staying pixel-crisp at any zoom.
- **Mini-map (radar):** a self-contained 2D-canvas overlay with its own draw
  loop (no React re-renders). Shows a deterministic star field echo, the
  genesis point, and a live viewport rectangle; click or drag to teleport (the
  main camera eases to the target).
- **Controls legend** overlay for discoverability.

**Verification**

- `npm run build` passes (tsc project refs + Vite), no errors.
- Pan (drag + keyboard), zoom (wheel + buttons + keys), grid + labels, and the
  mini-map all update at 60 FPS; teleport eases smoothly.
- Still a static SPA — deploys to Vercel Free unchanged.

---

## ✅ Phase 3 — Universe Manager

**Goal:** Full universe management — create, delete, rename, cards, universe
seed, timeline seed, persist locally.

**Delivered**

- Rich **universe cards**: icon, name, universe seed + timeline seed (mono),
  last-edited date, sim-clock, snapshot count, and an active badge.
- **Inline rename** (double-click the name or the pencil action; Enter commits,
  Esc cancels).
- **Duplicate** (full independent copy — same cosmos + timeline) distinct from
  the God panel's timeline-branch (same cosmos, new timeline).
- **Delete with in-card confirmation** (no accidental universe loss); deleting a
  universe also removes its snapshots.
- **Search** by name or seed, and **sort** by last-edited / created / name.
- **Create form** upgraded: seed randomizer (🎲) and a live seed preview showing
  the exact `0x…` value a word/number resolves to (`core/parseSeedInput`, pure).
- Snapshot counts loaded from IndexedDB via an index-only key scan.
- Shared `formatSimTime` extracted to `core/format.ts` (status bar reuses it).

**Verification**

- `npm run build` passes; manager create/rename/duplicate/delete all persist to
  IndexedDB and survive reload. Static SPA → deploys to Vercel Free unchanged.

---

## ⬜ Upcoming

- **Phase 4** — Procedural star generation (visible, infinite, searchable).
- …through **Phase 40** — production release.
