/**
 * Phase 35 — Simulation Optimizer
 *
 * Three complementary strategies keep Universe Engine at 60 FPS regardless
 * of universe scale:
 *
 *  1. LOD (Level of Detail) — objects far from the camera are replaced with
 *     cheaper representations (aggregated stats, single icon, nothing).
 *
 *  2. Object Pool — reusable typed arrays avoid GC pressure during the render
 *     loop. Typed-array pools are shared across Web Worker messages.
 *
 *  3. Chunk visibility — only chunks overlapping the viewport are materialised.
 *     This was already the starfield principle; this module generalises it for
 *     any entity layer (civilizations, particles, labels, etc.).
 */

import type { Camera } from './types';

// ---------------------------------------------------------------------------
// 1. LOD — Level of Detail
// ---------------------------------------------------------------------------

export type LodLevel = 'full' | 'reduced' | 'icon' | 'culled';

export interface LodBudget {
  /** Maximum visible distance for full-detail entities (world units). */
  fullDetailRadius: number;
  /** Maximum visible distance for reduced-detail entities. */
  reducedRadius: number;
  /** Maximum visible distance for icon-only entities. */
  iconRadius: number;
  /** Cap on total entities rendered this frame. */
  maxEntities: number;
}

export const DEFAULT_LOD_BUDGET: Readonly<LodBudget> = {
  fullDetailRadius:  800,
  reducedRadius:     3_200,
  iconRadius:        12_000,
  maxEntities:       2_000,
};

/** Return the LOD level for an entity given its world-space distance to camera. */
export function lodLevel(distanceWorld: number, budget: LodBudget = DEFAULT_LOD_BUDGET): LodLevel {
  if (distanceWorld > budget.iconRadius)    return 'culled';
  if (distanceWorld > budget.reducedRadius) return 'icon';
  if (distanceWorld > budget.fullDetailRadius) return 'reduced';
  return 'full';
}

// ---------------------------------------------------------------------------
// 2. Object Pool — typed-array recycling
// ---------------------------------------------------------------------------

/**
 * A lightweight pool of Float32Arrays.
 * Avoids repeated allocation/GC during per-frame render passes and
 * across Web Worker transfers (SharedArrayBuffer-compatible).
 */
export class Float32Pool {
  private readonly size: number;
  private readonly pool: Float32Array[] = [];

  constructor(arraySizeFloats: number, prewarm = 32) {
    this.size = arraySizeFloats;
    for (let i = 0; i < prewarm; i++) {
      this.pool.push(new Float32Array(arraySizeFloats));
    }
  }

  acquire(): Float32Array {
    return this.pool.pop() ?? new Float32Array(this.size);
  }

  release(arr: Float32Array): void {
    if (arr.length === this.size) this.pool.push(arr);
  }

  get available(): number { return this.pool.length; }
}

// ---------------------------------------------------------------------------
// 3. Chunk visibility — generalised viewport culling
// ---------------------------------------------------------------------------

export interface ChunkCoord { cx: number; cy: number }

/**
 * Returns all chunk coordinates that overlap the current viewport.
 * chunkSize is in world units. Works for any entity layer (stars, civs,
 * particles) — the same principle as the Renderer starfield but extracted
 * so every subsystem can share it.
 */
export function visibleChunks(cam: Camera, screenW: number, screenH: number, chunkSize: number): ChunkCoord[] {
  const halfW = (screenW / 2) / cam.zoom;
  const halfH = (screenH / 2) / cam.zoom;

  const minCx = Math.floor((cam.x - halfW) / chunkSize);
  const maxCx = Math.ceil( (cam.x + halfW) / chunkSize);
  const minCy = Math.floor((cam.y - halfH) / chunkSize);
  const maxCy = Math.ceil( (cam.y + halfH) / chunkSize);

  const chunks: ChunkCoord[] = [];
  for (let cx = minCx; cx <= maxCx; cx++) {
    for (let cy = minCy; cy <= maxCy; cy++) {
      chunks.push({ cx, cy });
    }
  }
  return chunks;
}

/** Evict chunk keys that are outside the extended (padded) visible set. */
export function evictStaleChunks(
  loaded: Map<string, unknown>,
  visible: ChunkCoord[],
  padRadius = 1
): string[] {
  const visSet = new Set(visible.map(({ cx, cy }) => `${cx},${cy}`));
  const stale: string[] = [];
  for (const key of loaded.keys()) {
    const [cxStr, cyStr] = key.split(',');
    const cx = Number(cxStr);
    const cy = Number(cyStr);
    let near = false;
    for (let dx = -padRadius; dx <= padRadius && !near; dx++) {
      for (let dy = -padRadius; dy <= padRadius && !near; dy++) {
        if (visSet.has(`${cx + dx},${cy + dy}`)) near = true;
      }
    }
    if (!near) stale.push(key);
  }
  return stale;
}
