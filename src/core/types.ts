/**
 * Core domain types for the Universe Engine.
 *
 * These are intentionally minimal in Phase 1 and are designed to be *extended*
 * (not rewritten) by later phases (galaxies, planets, life, civilizations...).
 */

/** A 2D point in world/universe space. */
export interface Vec2 {
  x: number;
  y: number;
}

/** Camera state for the infinite 2D viewport. */
export interface Camera {
  /** World-space coordinate at the centre of the viewport. */
  x: number;
  y: number;
  /** Zoom factor: world units are multiplied by this to get screen pixels. */
  zoom: number;
}

/**
 * A persisted universe. The heavy content (stars, galaxies, planets) is never
 * stored — only the seeds and the administrator's deliberate edits, so a
 * universe record stays tiny regardless of how large the simulated cosmos is.
 */
export interface Universe {
  id: string;
  name: string;
  /** Master seed the whole cosmos is generated from. */
  seed: number;
  /** Seed for the currently active timeline branch. */
  timelineSeed: number;
  /** Simulation time in seconds since universe genesis. */
  simTime: number;
  createdAt: number;
  updatedAt: number;
  /** Free-form notes the administrator can attach. */
  description?: string;
}

/** Playback state of the time engine. */
export interface TimeState {
  paused: boolean;
  /** Magnitude of simulation seconds advanced per real second. */
  speed: number;
  /** When true, the clock runs backwards (deterministic rewind). */
  reverse: boolean;
}

/** Kinds of things that can be selected/inspected in the viewport. */
export type EntityKind = 'universe' | 'galaxy' | 'star' | 'planet' | 'moon' | 'unknown';

/** A lightweight, transient reference to a selected entity. */
export interface Selection {
  kind: EntityKind;
  id: string;
  label: string;
  position?: Vec2;
}
