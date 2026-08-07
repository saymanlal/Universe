import { create } from 'zustand';

/** Which dockable panels are currently visible. */
export interface PanelVisibility {
  outliner: boolean;
  god: boolean;
  inspector: boolean;
}

interface UiState {
  panels: PanelVisibility;
  /** Widths of the side docks in pixels (resizable). */
  leftWidth: number;
  rightWidth: number;
  /** Universe manager modal. */
  managerOpen: boolean;

  togglePanel: (panel: keyof PanelVisibility) => void;
  setLeftWidth: (w: number) => void;
  setRightWidth: (w: number) => void;
  setManagerOpen: (open: boolean) => void;
}

export const MIN_DOCK_WIDTH = 220;
export const MAX_DOCK_WIDTH = 520;

const clampDock = (w: number) => Math.min(MAX_DOCK_WIDTH, Math.max(MIN_DOCK_WIDTH, Math.round(w)));

export const useUiStore = create<UiState>((set) => ({
  panels: { outliner: true, god: true, inspector: true },
  leftWidth: 260,
  rightWidth: 320,
  managerOpen: false,

  togglePanel: (panel) =>
    set((s) => ({ panels: { ...s.panels, [panel]: !s.panels[panel] } })),
  setLeftWidth: (w) => set({ leftWidth: clampDock(w) }),
  setRightWidth: (w) => set({ rightWidth: clampDock(w) }),
  setManagerOpen: (open) => set({ managerOpen: open }),
}));
