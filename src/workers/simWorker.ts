/**
 * Simulation Web Worker — Phase 35
 *
 * Runs heavy deterministic computations (star generation for unseen sectors,
 * civilization math-advancement, statistics roll-ups) off the main thread.
 *
 * Protocol:
 *   Main → Worker:  { type, payload }
 *   Worker → Main:  { type, result }
 *
 * Vite automatically bundles this as a separate chunk when imported with
 * `new Worker(new URL('./simWorker.ts', import.meta.url), { type: 'module' })`
 */

import { Rng, combineSeeds } from '../core/rng';

interface WorkerRequest {
  type: 'generate_stars' | 'advance_civs';
  payload: Record<string, unknown>;
}

self.onmessage = (evt: MessageEvent<WorkerRequest>) => {
  const { type, payload } = evt.data;

  switch (type) {
    case 'generate_stars': {
      const { seed, cx, cy, count } = payload as { seed: number; cx: number; cy: number; count: number };
      const rng = new Rng(combineSeeds(seed, cx, cy, 0x51a7));
      const stars: Array<{ x: number; y: number; r: number; tint: number }> = [];
      const CHUNK_SIZE = 1600;
      const TINTS = [0xffffff, 0xbfd0ff, 0xfff3d6, 0xffd9b0, 0xd6c4ff, 0xc9f2ff];
      for (let i = 0; i < count; i++) {
        stars.push({
          x: cx * CHUNK_SIZE + rng.float(0, CHUNK_SIZE),
          y: cy * CHUNK_SIZE + rng.float(0, CHUNK_SIZE),
          r: rng.float(0.4, 2.2),
          tint: TINTS[rng.int(0, TINTS.length - 1)]!,
        });
      }
      self.postMessage({ type: 'generate_stars', result: stars });
      break;
    }

    case 'advance_civs': {
      // Math-only advancement: compute population growth over a dt period.
      const { population, growthRate, dtYears } = payload as {
        population: number; growthRate: number; dtYears: number;
      };
      const newPop = Math.round(population * Math.pow(1 + growthRate, dtYears));
      self.postMessage({ type: 'advance_civs', result: { population: newPop } });
      break;
    }

    default:
      self.postMessage({ type: 'error', result: `Unknown message type: ${type}` });
  }
};
