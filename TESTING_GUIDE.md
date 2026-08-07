# Universe Engine — Phase Testing & Verification Guide

This guide details how to locate, inspect, and test every subsystem, entity, planet, species, civilization, and conversation in **Universe Engine**.

---

## 🚀 Quick Start Testing
1. **Launch the Engine**:
   ```bash
   npm run dev
   ```
2. **Open God Mode Workspace**:
   Navigate to `http://localhost:5173`.
3. **Seed Control**:
   In the **Universe Manager** modal (top toolbar icon), create a universe with a known seed phrase (e.g. `Andromeda Sandbox` or `Seed-42`) to guarantee 100% reproducible results.

---

## 🔍 Step-by-Step Feature Testing Guide

### 1. Phase 1–3: Camera, Mini-Map, Universe Manager
- **Pan & Zoom**: Use `WASD` / Arrow keys to pan, or click and drag. Scroll wheel or `+`/`-` keys zoom in and out. Press `0` or `Home` to re-center on origin `(0, 0)`.
- **Mini-Map**: Observe the bottom-right mini-map radar. Click anywhere on the mini-map to instantly teleport the camera.
- **Universe Manager**: Click the galaxy icon on the top toolbar to open the Universe Manager. Test creating, renaming, duplicating, and deleting universes.

### 2. Phase 4–10: Galaxies, Stars, Solar Systems & Planets
- **Galaxy & Star Inspection**: Click on any galaxy cluster or star system in the visible area.
- **Outliner Panel**: Expand nodes on the left Outliner panel to view the procedural hierarchy (Galaxy → Solar System → Star → Planet → Moons).
- **Inspector Panel**: Click any planet to open the right Inspector panel. View its mass, gravity, biome, atmosphere, surface temperature, and life probability.

### 3. Phase 11–13: Resources, Chemistry & Climate Engines
- **Resource Composition**: In the Planet Inspector, review the mineral distribution, gas atmospheric fractions, and available energy potential.
- **Climate State**: Inspect cloud density, rain probability, surface temperature, and prevailing wind speeds computed deterministically from atmospheric mass and star distance.

### 4. Phase 14–16: Life, Evolution & Sapient Species
- **Locating Intelligent Life**:
  - Open the **Outliner** or **Search Panel**.
  - Planets with `lifeProbability > 0.6` and favorable biomes (e.g. *oceanic*, *terrran*) automatically generate life.
  - Check the **Life & Evolution** section in the Planet Inspector to view the species' DNA sequence (64-character hex marker), physical form (bipedal, aquatic, etc.), cognition IQ, and language family.

### 5. Phase 17–20: Civilizations, People, Personality & Conversations
- **Civilizations & Settlements**:
  - Planets with sapient life generate civilizations (e.g. *United Vael Realm*).
  - Inspect capital cities, towns, and outposts with coordinates, population metrics, polity type, and tech era.
- **Inhabitants & People**:
  - Inspect any settlement to view individual inhabitants generated lazily on observation.
  - View individual age, occupation, home address, schedule, and item inventory.
- **Psychological Profile**:
  - Inspect an inhabitant to view their Big Five personality traits (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism), emotional state, goals, and habits.
- **Observing Conversations**:
  - Select two inhabitants in the same settlement.
  - Click **Observe Dialogue** in God Mode. The engine will deterministically generate real-time dialogue between the participants based on their occupations, personalities, and current topic without persisting dialogue text on disk.

---

## 🧪 Comprehensive Programmatic Verification
To run automated verification checks across all phase engines:
```bash
npm run build
```
`tsc -b && vite build` verifies that all phase modules strictly typecheck without any TypeScript or bundling errors.
