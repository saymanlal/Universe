import { create } from 'zustand';

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

  setFps: (fps: number) => void;
  setCursor: (cursor: { x: number; y: number } | null) => void;
  setDrawn: (drawn: number) => void;
}

export const useStatsStore = create<StatsState>((set) => ({
  fps: 0,
  cursor: null,
  drawn: 0,
  setFps: (fps) => set({ fps }),
  setCursor: (cursor) => set({ cursor }),
  setDrawn: (drawn) => set({ drawn }),
}));
