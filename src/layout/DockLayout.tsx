import { Toolbar } from '@/layout/Toolbar';
import { StatusBar } from '@/layout/StatusBar';
import { ResizeHandle } from '@/layout/ResizeHandle';
import { OutlinerPanel } from '@/panels/OutlinerPanel';
import { GodPanel } from '@/panels/GodPanel';
import { InspectorPanel } from '@/panels/InspectorPanel';
import { UniverseManager } from '@/panels/UniverseManager';
import { UniverseCanvas } from '@/canvas/UniverseCanvas';
import { ViewportOverlay } from '@/canvas/ViewportOverlay';
import { useUiStore } from '@/state/useUiStore';
import { useTimeEngine } from '@/state/useTimeEngine';

/**
 * The Unity/Figma-style dockable workspace: a top toolbar, resizable left and
 * right docks, a central viewport, and a bottom status bar. Panels can be
 * toggled from the toolbar; docks are drag-resizable.
 */
export function DockLayout() {
  useTimeEngine();
  const panels = useUiStore((s) => s.panels);
  const leftWidth = useUiStore((s) => s.leftWidth);
  const rightWidth = useUiStore((s) => s.rightWidth);
  const setLeftWidth = useUiStore((s) => s.setLeftWidth);
  const setRightWidth = useUiStore((s) => s.setRightWidth);

  return (
    <div className="flex h-full w-full flex-col bg-space-950 text-space-300">
      <Toolbar />

      <div className="flex min-h-0 flex-1">
        {/* Left dock: Outliner */}
        {panels.outliner && (
          <>
            <aside
              className="flex shrink-0 flex-col border-r border-space-700 bg-space-850"
              style={{ width: leftWidth }}
            >
              <OutlinerPanel />
            </aside>
            <ResizeHandle width={leftWidth} side="left" onResize={setLeftWidth} />
          </>
        )}

        {/* Center: viewport */}
        <main className="relative min-w-0 flex-1">
          <UniverseCanvas />
          <ViewportOverlay />
        </main>

        {/* Right dock: God tools + Inspector */}
        {(panels.god || panels.inspector) && (
          <>
            <ResizeHandle width={rightWidth} side="right" onResize={setRightWidth} />
            <aside
              className="flex shrink-0 flex-col border-l border-space-700 bg-space-850"
              style={{ width: rightWidth }}
            >
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
            </aside>
          </>
        )}
      </div>

      <StatusBar />
      <UniverseManager />
    </div>
  );
}
