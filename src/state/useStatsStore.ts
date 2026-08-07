import { create } from 'zustand';
import type { Camera } from '@/core/types';

/**
 * Live, high-frequency viewport telemetry written by the renderer and read by
 * the status bar / mini-map. Kept in its own store so frequent FPS/cursor
 * updates never trigger re-renders of the heavier universe store consumers.
 */
interface StatsState {
  fps: number;
  /** World-space cursor position, or null when off-canvas. */
  cursor: { x: number; y: number } | null;
  /** Number of draw objects currently rendered (for the LOD budget HUD). */
  drawn: number;
  /**
   * The renderer's *smoothed* display camera (eased toward the store target).
   * Non-reactive: the mini-map reads it imperatively each frame so 60 Hz
   * camera motion never re-renders React.
   */
  view: Camera;
  /** Main viewport size in CSS pixels (for mini-map viewport-rect math). */
  viewport: { w: number; h: number };
  /** Galaxy (or "Intergalactic space") under the camera centre. */
  region: string | null;

  setFps: (fps: number) => void;
  setCursor: (cursor: { x: number; y: number } | null) => void;
  setDrawn: (drawn: number) => void;
  setView: (view: Camera) => void;
  setViewport: (viewport: { w: number; h: number }) => void;
  setRegion: (region: string | null) => void;
}

export const useStatsStore = create<StatsState>((set) => ({
  fps: 0,
  cursor: null,
  drawn: 0,
  view: { x: 0, y: 0, zoom: 1 },
  viewport: { w: 1, h: 1 },
  region: null,
  setFps: (fps) => set({ fps }),
  setCursor: (cursor) => set({ cursor }),
  setDrawn: (drawn) => set({ drawn }),
  setView: (view) => set({ view }),
  setViewport: (viewport) => set({ viewport }),
  setRegion: (region) => set({ region }),
}));
