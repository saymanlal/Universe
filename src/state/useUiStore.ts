import { create } from 'zustand';

/** Which dockable panels are currently visible. */
export interface PanelVisibility {
  outliner: boolean;
  god: boolean;
  inspector: boolean;
  timeline: boolean;
}

interface UiState {
  panels: PanelVisibility;
  /** Widths of the side docks in pixels (resizable). */
  leftWidth: number;
  rightWidth: number;
  /** Universe manager modal. */
  managerOpen: boolean;
  /** Search command palette. */
  searchOpen: boolean;
  /** Active God-Mode placement tool (armed for the next canvas click). */
  godTool: 'none' | 'spawn' | 'move';

  togglePanel: (panel: keyof PanelVisibility) => void;
  setLeftWidth: (w: number) => void;
  setRightWidth: (w: number) => void;
  setManagerOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setGodTool: (tool: 'none' | 'spawn' | 'move') => void;
}

export const MIN_DOCK_WIDTH = 220;
export const MAX_DOCK_WIDTH = 520;

const clampDock = (w: number) => Math.min(MAX_DOCK_WIDTH, Math.max(MIN_DOCK_WIDTH, Math.round(w)));

export const useUiStore = create<UiState>((set) => ({
  panels: { outliner: true, god: true, inspector: true, timeline: true },
  leftWidth: 260,
  rightWidth: 320,
  managerOpen: false,
  searchOpen: false,
  godTool: 'none',

  togglePanel: (panel) =>
    set((s) => ({ panels: { ...s.panels, [panel]: !s.panels[panel] } })),
  setLeftWidth: (w) => set({ leftWidth: clampDock(w) }),
  setRightWidth: (w) => set({ rightWidth: clampDock(w) }),
  setManagerOpen: (open) => set({ managerOpen: open }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  setGodTool: (tool) => set({ godTool: tool }),
}));
