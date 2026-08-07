/**
 * Phase 34 — Replay Engine
 *
 * Replays historical events and experiment runs deterministically.
 * Because the entire cosmos is seed-driven, "replay" means advancing a
 * virtual sim-clock from a saved start time and emitting state snapshots
 * at fixed intervals — no recording of every frame is ever needed.
 *
 * The ReplaySession lives entirely in memory during playback and can be
 * ticked by the existing useTimeEngine rAF loop without any backend.
 */

import type { Universe } from './types';
import type { PhysicsConstants } from './physics';
import { applyPhysicsOverrides, DEFAULT_PHYSICS } from './physics';
import type { HistoricalEvent } from './history';

export type ReplayStatus = 'idle' | 'playing' | 'paused' | 'finished';

export interface ReplayKeyframe {
  simTime: number;
  /** World-space camera target for this moment */
  cameraTarget: { x: number; y: number; zoom: number };
  /** Any notable event occurring at this sim-time */
  event?: Pick<HistoricalEvent, 'title' | 'type' | 'importance'>;
}

export interface ReplaySession {
  id: string;
  universeId: string;
  label: string;
  physics: PhysicsConstants;
  startSimTime: number;
  endSimTime: number;
  totalDurationSeconds: number; // real-time wall-clock seconds for full playback
  keyframes: ReplayKeyframe[];
  status: ReplayStatus;
  /** Elapsed real-world seconds since play() was called */
  elapsedRealSeconds: number;
  /** Current interpolated sim-time based on elapsed real seconds */
  currentSimTime: number;
}

/**
 * Build a ReplaySession from a universe snapshot.
 * Keyframes are generated deterministically — no recording required.
 */
export function buildReplaySession(
  universe: Universe,
  overrides: Partial<PhysicsConstants> = {},
  durationRealSeconds = 60
): ReplaySession {
  const physics = applyPhysicsOverrides({ ...DEFAULT_PHYSICS, ...overrides });
  const startSimTime = universe.simTime;
  // Replay covers the full elapsed sim-time of this universe compressed into
  // durationRealSeconds of wall-clock time.
  const endSimTime = Math.max(startSimTime + 1, universe.simTime);
  const simSpan = Math.max(endSimTime - startSimTime, 31_557_600); // min 1 sim-year

  // Generate sparse keyframes at 10% intervals of the sim span.
  const keyframes: ReplayKeyframe[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = startSimTime + (simSpan * i) / 10;
    keyframes.push({
      simTime: t,
      cameraTarget: {
        x: Math.sin(i * 0.63) * 800,
        y: Math.cos(i * 0.63) * 800,
        zoom: 0.5 + i * 0.05,
      },
    });
  }

  return {
    id: `replay_${universe.id}_${Date.now()}`,
    universeId: universe.id,
    label: `Replay of ${universe.name}`,
    physics,
    startSimTime,
    endSimTime,
    totalDurationSeconds: durationRealSeconds,
    keyframes,
    status: 'idle',
    elapsedRealSeconds: 0,
    currentSimTime: startSimTime,
  };
}

/** Advance the replay clock by `dtReal` real-world seconds. Returns updated session. */
export function tickReplay(session: ReplaySession, dtReal: number): ReplaySession {
  if (session.status !== 'playing') return session;

  const elapsed = session.elapsedRealSeconds + dtReal;
  const progress = Math.min(1, elapsed / session.totalDurationSeconds);
  const simSpan = session.endSimTime - session.startSimTime;
  const currentSimTime = session.startSimTime + simSpan * progress;
  const status: ReplayStatus = progress >= 1 ? 'finished' : 'playing';

  return { ...session, elapsedRealSeconds: elapsed, currentSimTime, status };
}

/** Interpolate the camera target for the current replay sim-time. */
export function interpolateCameraAt(session: ReplaySession): { x: number; y: number; zoom: number } {
  const { keyframes, currentSimTime } = session;
  if (keyframes.length === 0) return { x: 0, y: 0, zoom: 1 };

  // Find surrounding keyframes
  let lo = keyframes[0]!;
  let hi = keyframes[keyframes.length - 1]!;
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (keyframes[i]!.simTime <= currentSimTime && keyframes[i + 1]!.simTime >= currentSimTime) {
      lo = keyframes[i]!;
      hi = keyframes[i + 1]!;
      break;
    }
  }

  const span = hi.simTime - lo.simTime;
  const t = span > 0 ? (currentSimTime - lo.simTime) / span : 0;
  return {
    x: lo.cameraTarget.x + (hi.cameraTarget.x - lo.cameraTarget.x) * t,
    y: lo.cameraTarget.y + (hi.cameraTarget.y - lo.cameraTarget.y) * t,
    zoom: lo.cameraTarget.zoom + (hi.cameraTarget.zoom - lo.cameraTarget.zoom) * t,
  };
}
