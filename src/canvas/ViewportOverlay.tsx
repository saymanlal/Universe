import { useUniverseStore } from '@/state/useUniverseStore';
import { HomeIcon, PlusIcon, GridIcon } from '@/components/icons';

/**
 * Floating HUD controls layered over the viewport. Purely drives camera state
 * in the store; the renderer picks the changes up on its next tick.
 */
export function ViewportOverlay() {
  const camera = useUniverseStore((s) => s.camera);
  const setCamera = useUniverseStore((s) => s.setCamera);

  const zoomBy = (factor: number) =>
    setCamera({ zoom: Math.min(24, Math.max(0.04, camera.zoom * factor)) });

  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute bottom-3 left-3 hidden select-none gap-3 rounded-md border border-space-700 bg-space-850/80 px-2.5 py-1.5 font-mono text-[10px] text-space-500 backdrop-blur sm:flex">
        <span>
          <span className="kbd">drag</span> pan
        </span>
        <span>
          <span className="kbd">WASD</span> move
        </span>
        <span>
          <span className="kbd">scroll</span> zoom
        </span>
        <span>
          <span className="kbd">0</span> home
        </span>
      </div>

      <div className="pointer-events-auto absolute bottom-3 right-3 flex flex-col gap-1 rounded-lg border border-space-700 bg-space-850/90 p-1 backdrop-blur">
        <button className="btn btn-icon" title="Zoom in" onClick={() => zoomBy(1.3)}>
          <PlusIcon width={16} height={16} />
        </button>
        <div className="px-1 text-center font-mono text-[10px] text-space-400">
          {Math.round(camera.zoom * 100)}%
        </div>
        <button className="btn btn-icon" title="Zoom out" onClick={() => zoomBy(1 / 1.3)}>
          <GridIcon width={16} height={16} />
        </button>
        <div className="my-0.5 h-px w-full bg-space-700" />
        <button
          className="btn btn-icon"
          title="Reset view to genesis (origin)"
          onClick={() => setCamera({ x: 0, y: 0, zoom: 1 })}
        >
          <HomeIcon width={16} height={16} />
        </button>
      </div>
    </div>
  );
}
