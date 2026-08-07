import { useUniverseStore } from '@/state/useUniverseStore';
import { useUiStore } from '@/state/useUiStore';
import {
  GalaxyIcon,
  LayersIcon,
  PauseIcon,
  PlayIcon,
  SlidersIcon,
  CrosshairIcon,
  SearchIcon,
} from '@/components/icons';

/** Simulation speed presets (sim-seconds per real second). */
const SPEEDS = [1, 60, 3600, 86400, 604800];
const SPEED_LABELS: Record<number, string> = {
  1: '1×',
  60: 'min',
  3600: 'hour',
  86400: 'day',
  604800: 'week',
};

/**
 * The top application toolbar: brand, universe switcher entry point, time
 * transport (foundation for Phase 8), and panel toggles.
 */
export function Toolbar() {
  const active = useUniverseStore((s) => s.active());
  const time = useUniverseStore((s) => s.time);
  const setTime = useUniverseStore((s) => s.setTime);
  const setManagerOpen = useUiStore((s) => s.setManagerOpen);
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);
  const panels = useUiStore((s) => s.panels);
  const togglePanel = useUiStore((s) => s.togglePanel);

  return (
    <header className="flex h-11 shrink-0 items-center gap-2 border-b border-space-700 bg-space-900 px-3">
      <div className="flex items-center gap-2 pr-2">
        <div className="grid h-6 w-6 place-items-center rounded-md bg-accent/20 text-accent">
          <GalaxyIcon width={16} height={16} />
        </div>
        <span className="text-sm font-semibold tracking-tight text-white">Universe Engine</span>
        <span className="rounded bg-space-700 px-1.5 py-0.5 text-[10px] font-medium text-space-400">
          God Mode
        </span>
      </div>

      <div className="h-5 w-px bg-space-700" />

      <button className="btn" onClick={() => setManagerOpen(true)}>
        <LayersIcon width={14} height={14} />
        {active ? active.name : 'No universe'}
      </button>

      <button
        className="btn"
        onClick={() => setSearchOpen(true)}
        disabled={!active}
        title="Search stars (Ctrl/⌘+K or /)"
      >
        <SearchIcon width={14} height={14} />
        Search
        <span className="kbd ml-1">⌘K</span>
      </button>

      <div className="mx-auto flex items-center gap-1 rounded-lg border border-space-700 bg-space-850 px-1 py-1">
        <button
          className={`btn btn-icon ${!time.paused ? '' : 'btn-primary'}`}
          title="Pause"
          onClick={() => setTime({ paused: true })}
          disabled={!active}
        >
          <PauseIcon width={14} height={14} />
        </button>
        <button
          className={`btn btn-icon ${time.paused ? '' : 'btn-primary'}`}
          title="Play"
          onClick={() => setTime({ paused: false })}
          disabled={!active}
        >
          <PlayIcon width={14} height={14} />
        </button>
        <div className="mx-1 h-4 w-px bg-space-700" />
        {SPEEDS.map((sp) => (
          <button
            key={sp}
            className={`btn px-2 ${time.speed === sp ? 'text-white' : ''}`}
            onClick={() => setTime({ speed: sp })}
            disabled={!active}
          >
            {SPEED_LABELS[sp]}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <button
          className={`btn btn-icon ${panels.outliner ? 'text-white' : ''}`}
          title="Toggle Outliner"
          onClick={() => togglePanel('outliner')}
        >
          <LayersIcon width={16} height={16} />
        </button>
        <button
          className={`btn btn-icon ${panels.god ? 'text-white' : ''}`}
          title="Toggle God Panel"
          onClick={() => togglePanel('god')}
        >
          <SlidersIcon width={16} height={16} />
        </button>
        <button
          className={`btn btn-icon ${panels.inspector ? 'text-white' : ''}`}
          title="Toggle Inspector"
          onClick={() => togglePanel('inspector')}
        >
          <CrosshairIcon width={16} height={16} />
        </button>
      </div>
    </header>
  );
}
