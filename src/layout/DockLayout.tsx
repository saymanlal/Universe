import { Toolbar } from '@/layout/Toolbar';
import { StatusBar } from '@/layout/StatusBar';
import { ResizeHandle } from '@/layout/ResizeHandle';
import { OutlinerPanel } from '@/panels/OutlinerPanel';
import { GodPanel } from '@/panels/GodPanel';
import { InspectorPanel } from '@/panels/InspectorPanel';
import { UniverseManager } from '@/panels/UniverseManager';
import { SearchPanel } from '@/panels/SearchPanel';
import { ImportExportPanel } from '@/panels/ImportExportPanel';
import { PluginPanel } from '@/panels/PluginPanel';
import { TimelineBar } from '@/panels/TimelineBar';
import { UniverseCanvas } from '@/canvas/UniverseCanvas';
import { ViewportOverlay } from '@/canvas/ViewportOverlay';
import { MiniMap } from '@/canvas/MiniMap';
import { useUiStore } from '@/state/useUiStore';
import { useUniverseStore } from '@/state/useUniverseStore';
import { useEditsStore } from '@/state/useEditsStore';
import { useTimeEngine } from '@/state/useTimeEngine';
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ToastContainer } from '@/components/Toast';

/**
 * The Unity/Figma-style dockable workspace: a top toolbar, resizable left and
 * right docks, a central viewport, and a bottom status bar. Panels can be
 * toggled from the toolbar; docks are drag-resizable.
 */
export function DockLayout() {
  useTimeEngine();
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);
  const activeId = useUniverseStore((s) => s.activeId);

  // Load the active universe's God-Mode edits (spawns/deletions) from IndexedDB.
  useEffect(() => {
    void useEditsStore.getState().loadForUniverse(activeId);
  }, [activeId]);

  // Global shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing =
        el instanceof HTMLElement &&
        (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

      // Star search.
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (e.key === '/' && !typing) {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (typing) return;

      // Undo / redo (Ctrl/Cmd+Z, Shift for redo, or Ctrl+Y).
      if ((e.key === 'z' || e.key === 'Z') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (e.shiftKey) useEditsStore.getState().redo();
        else useEditsStore.getState().undo();
        return;
      }
      if ((e.key === 'y' || e.key === 'Y') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        useEditsStore.getState().redo();
        return;
      }

      // Delete selected stars.
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const ids = useUniverseStore
          .getState()
          .selections.filter((s) => s.kind === 'star')
          .map((s) => s.id);
        if (ids.length > 0) {
          e.preventDefault();
          useEditsStore.getState().deleteStars(ids);
        }
        return;
      }

      // Cancel tool / clear selection.
      if (e.key === 'Escape') {
        useUiStore.getState().setGodTool('none');
        useUniverseStore.getState().clearSelection();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setSearchOpen]);

  const panels = useUiStore((s) => s.panels);
  const hasUniverse = useUniverseStore((s) => s.activeId !== null);
  const leftWidth = useUiStore((s) => s.leftWidth);
  const rightWidth = useUiStore((s) => s.rightWidth);
  const setLeftWidth = useUiStore((s) => s.setLeftWidth);
  const setRightWidth = useUiStore((s) => s.setRightWidth);

  return (
    <div className="flex h-full w-full flex-col bg-space-950 text-space-300">
      <Toolbar />

      <div className="flex min-h-0 flex-1">
        {/* Left dock: Outliner */}
        <AnimatePresence>
          {panels.outliner && (
            <motion.aside
              key="left-dock"
              className="flex shrink-0 flex-col border-r border-space-700 bg-space-850 relative"
              style={{ width: leftWidth }}
              initial={{ x: -260, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -260, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <OutlinerPanel />
              <div className="absolute top-0 bottom-0 -right-2 z-10 w-4 flex justify-center">
                <ResizeHandle width={leftWidth} side="left" onResize={setLeftWidth} />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Center: viewport */}
        <main className="relative min-w-0 flex-1">
          <UniverseCanvas />
          <ViewportOverlay />
          <MiniMap />
        </main>

        {/* Right dock: God tools + Inspector */}
        <AnimatePresence>
          {(panels.god || panels.inspector) && (
            <motion.aside
              key="right-dock"
              className="flex shrink-0 flex-col border-l border-space-700 bg-space-850 relative"
              style={{ width: rightWidth }}
              initial={{ x: 260, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 260, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="absolute top-0 bottom-0 -left-2 z-10 w-4 flex justify-center">
                <ResizeHandle width={rightWidth} side="right" onResize={setRightWidth} />
              </div>
              {panels.god && (
                <div className={panels.inspector ? 'h-1/2 min-h-0 border-b border-space-700' : 'flex-1 min-h-0'}>
                  <GodPanel />
                </div>
              )}
              {panels.inspector && (
                <div className="min-h-0 flex-1">
                  <InspectorPanel />
                </div>
              )}
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {panels.timeline && hasUniverse && <TimelineBar />}

      <StatusBar />
      <UniverseManager />
      <SearchPanel />
      <ImportExportPanel />
      <PluginPanel />
      <ToastContainer />
    </div>
  );
}
