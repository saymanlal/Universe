/**
 * Phase 33 — Experiment System
 *
 * Administrators can save "experiments" — named snapshots of a universe's
 * physics, camera, and sim-time state that can be re-applied or replayed.
 * Experiments are stored entirely in IndexedDB (no backend); the universe
 * itself is never duplicated — only the configuration delta is saved.
 */

import type { PhysicsConstants } from './physics';
import type { Camera } from './types';
import { createId } from './ids';

export interface ExperimentConfig {
  /** Human-readable scenario name, e.g. "Double Gravity at Year 500" */
  name: string;
  /** Optional description / hypothesis text */
  description?: string;
  /** Physics constant overrides to apply when the experiment runs */
  physicsOverrides: Partial<PhysicsConstants>;
  /** Camera position/zoom the experiment starts from */
  cameraState: Camera;
  /** Simulation time (seconds) to fast-forward to on replay */
  startSimTime: number;
  /** Duration (sim-seconds) to run before auto-pausing */
  durationSimSeconds: number;
}

export interface Experiment {
  id: string;
  universeId: string;
  createdAt: number;
  config: ExperimentConfig;
  /** Whether a replay run has ever been completed */
  completed: boolean;
  /** Notes recorded after the run */
  observations?: string;
}

/** Factory — creates an unsaved Experiment record ready for IndexedDB persistence. */
export function createExperiment(universeId: string, config: ExperimentConfig): Experiment {
  return {
    id: createId('exp'),
    universeId,
    createdAt: Date.now(),
    config,
    completed: false,
  };
}

/** Mark an experiment as completed and attach observer notes. */
export function completeExperiment(exp: Experiment, observations: string): Experiment {
  return { ...exp, completed: true, observations };
}

/**
 * Returns a lightweight diff summary comparing two experiments' physics configs.
 * Used by the UI to surface what changed between runs.
 */
export function diffExperiments(
  a: Experiment,
  b: Experiment
): Array<{ constant: string; valueA: number | undefined; valueB: number | undefined }> {
  const keys = new Set([
    ...Object.keys(a.config.physicsOverrides),
    ...Object.keys(b.config.physicsOverrides),
  ]);

  return [...keys].map((key) => ({
    constant: key,
    valueA: (a.config.physicsOverrides as Record<string, number>)[key],
    valueB: (b.config.physicsOverrides as Record<string, number>)[key],
  }));
}
