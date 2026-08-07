# Platform Testing Guide

This guide details the complete testing and verification procedures for the **Universe Engine** platform across all deployment targets and runtime environments.

---

## 🚀 Overview

Universe Engine is a research-grade, frontend-only deterministic 2D universe simulator built with React, Vite, TypeScript, PixiJS, Zustand, Dexie (IndexedDB), Web Workers, Framer Motion, and Tailwind CSS.

This testing guide ensures that all subsystems, UI workflows, rendering components, and state management logic perform reliably without a backend server.

---

## 🛠️ Prerequisites & Local Setup

1. **Environment Requirements**:
   - Node.js `^20.0.0`
   - npm `^10.0.0`
   - Modern Chromium or WebKit-based browser with WebGL 2 and IndexedDB support.

2. **Installation**:
   ```bash
   npm install
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Navigate to `http://localhost:5173`.

---

## 🧪 Build & Verification Workflow

Run the full type-checking and production bundle compilation:

```bash
npm run build
```

Preview the static production build locally:

```bash
npm run preview
```

---

## 🔍 Platform Testing Checklist

### 1. Engine Core & Determinism
- **Seed Consistency**: Creating a universe with the exact same seed phrase must reproduce identical cosmic structures (galaxies, star systems, biomes, and intelligent life).
- **Time Engine**: Test play, pause, and simulation speed adjustments (`1x` to `1000x`). Ensure sim clock advances deterministically without time drift.

### 2. Rendering & Performance
- **WebGL Viewport**: Verify infinite 2D camera panning via drag and WASD / Arrow keys.
- **Eased Zooming**: Test scroll-wheel and keyboard zoom. Ensure smooth easing without jitter or flickering artifacts.
- **Radar Mini-map**: Click anywhere on the bottom-right radar mini-map to teleport the camera view.
- **Frame Rate Target**: Maintain 60 FPS under normal viewport operations across high-density starfield chunks.

### 3. State & Local Storage (Offline-First)
- **IndexedDB Sync**: Test creating, renaming, duplicating, and deleting universes in the Universe Manager.
- **Autosave & Persistence**: Refresh the browser page to confirm that all universe edits, active selections, and state changes persist without requiring a login or backend connection.

### 4. Vercel & Production Release Readiness
- **Zero Server Dependencies**: Ensure no external API calls, database connections, or serverless functions are required.
- **SPA Routing**: Verify that deep links and client-side routes resolve properly under production static hosting.
