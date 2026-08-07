import { hashString } from './rng';

/**
 * Deterministic-ish unique id generator for administrator-created entities
 * and records. Uses a monotonic counter mixed with a per-session salt so ids
 * are unique within a session without relying on crypto APIs.
 *
 * NOTE: This is only for *persisted* records (universes, snapshots, manual
 * spawns). Procedurally generated cosmic objects derive their ids purely from
 * seeds + coordinates and never use this.
 */
let counter = 0;
const sessionSalt = hashString(String(performance.now()) + navigator.userAgent).toString(36);

export function createId(prefix = 'id'): string {
  counter = (counter + 1) >>> 0;
  const time = Math.floor(performance.now()).toString(36);
  return `${prefix}_${sessionSalt}${time}${counter.toString(36)}`;
}
