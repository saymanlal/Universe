import { useUniverseStore } from '@/state/useUniverseStore';
import { CrosshairIcon, GalaxyIcon, StarIcon } from '@/components/icons';

/**
 * Scene outliner. In Phase 1 it lists the active universe and its genesis
 * point. Galaxies, systems and entities become expandable nodes here as their
 * generation phases land — this component is structured to grow, not be
 * replaced.
 */
export function OutlinerPanel() {
  const active = useUniverseStore((s) => s.active());
  const selection = useUniverseStore((s) => s.selection);
  const setSelection = useUniverseStore((s) => s.setSelection);
  const setCamera = useUniverseStore((s) => s.setCamera);

  if (!active) {
    return (
      <div className="p-3 text-xs text-space-400">No active universe.</div>
    );
  }

  const selectGenesis = () => {
    setSelection({ kind: 'universe', id: active.id, label: 'Genesis Point', position: { x: 0, y: 0 } });
    setCamera({ x: 0, y: 0 });
  };

  const isSelected = selection?.id === active.id;

  return (
    <div className="flex h-full flex-col">
      <div className="panel-header">
        <span>Outliner</span>
      </div>
      <div className="flex-1 overflow-auto p-1 text-sm">
        <button
          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
            isSelected ? 'bg-accent/15 text-white' : 'text-space-300 hover:bg-space-700'
          }`}
          onClick={selectGenesis}
        >
          <GalaxyIcon width={14} height={14} className="text-accent" />
          <span className="truncate">{active.name}</span>
        </button>

        <div className="ml-4 mt-0.5 border-l border-space-700 pl-2">
          <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-space-400">
            <CrosshairIcon width={13} height={13} />
            <span className="text-xs">Genesis Point · (0, 0)</span>
          </div>
          <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-space-500">
            <StarIcon width={13} height={13} />
            <span className="text-xs italic">Cosmic structure generates on observation</span>
          </div>
        </div>
      </div>
    </div>
  );
}
