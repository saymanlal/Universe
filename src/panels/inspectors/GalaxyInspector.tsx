import { motion } from 'framer-motion';
import { findGalaxyById, galaxyTypeLabel, type Galaxy } from '@/sim/galaxy';
import { formatCompact } from '@/core/format';
import { clampZoom } from '@/canvas/viewport';
import { useUniverseStore } from '@/state/useUniverseStore';
import { CrosshairIcon } from '@/components/icons';

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="field-label">{label}</span>
      <span className="font-mono text-xs text-space-200">
        {value}
        {unit && <span className="ml-0.5 text-space-500">{unit}</span>}
      </span>
    </div>
  );
}

/** Inspector body for a selected galaxy, resolved deterministically by id. */
export function GalaxyInspector({ id }: { id: string }) {
  const setCamera = useUniverseStore((s) => s.setCamera);
  const galaxy: Galaxy | null = findGalaxyById(id);

  if (!galaxy) {
    return <div className="p-3 text-xs text-space-400">Galaxy could not be resolved.</div>;
  }

  return (
    <div className="p-3">
      <motion.div
        key={galaxy.id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="mb-3 flex items-center gap-3">
          <div
            className="h-10 w-10 shrink-0 rounded-full"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${hex(galaxy.coreColor)}, ${hex(
                galaxy.color,
              )} 45%, rgba(5,6,10,0.9) 80%)`,
              boxShadow: `0 0 20px 2px ${hex(galaxy.color)}66`,
            }}
          />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">
              {galaxy.name ?? galaxy.designation}
            </div>
            <div className="font-mono text-[11px] text-space-400">
              {galaxy.name ? `${galaxy.designation} · ` : ''}
              {galaxyTypeLabel(galaxy.type)} galaxy
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-space-700 bg-space-800/60 p-2.5">
          <Stat label="Type" value={galaxyTypeLabel(galaxy.type)} />
          <Stat label="Diameter" value={formatCompact(galaxy.radius * 2)} unit="u" />
          <Stat label="Ellipticity" value={(1 - galaxy.eccentricity).toFixed(2)} />
          {galaxy.type === 'spiral' && <Stat label="Arms" value={String(galaxy.armCount)} />}
          <Stat label="Est. stars" value={`≈ ${formatCompact(galaxy.starEstimate)}`} />
          <Stat
            label="Center"
            value={`${formatCompact(galaxy.x)}, ${formatCompact(galaxy.y)}`}
          />
        </div>

        <button
          className="btn btn-primary mt-3 w-full justify-center"
          onClick={() =>
            setCamera({ x: galaxy.x, y: galaxy.y, zoom: clampZoom(500 / galaxy.radius) })
          }
        >
          <CrosshairIcon width={14} height={14} />
          Frame galaxy
        </button>

        <p className="mt-3 text-[11px] leading-relaxed text-space-500">
          Zoom in to dissolve this galaxy into its individual stars. Its shape, size and star
          density are generated deterministically from the universe seed.
        </p>
      </motion.div>
    </div>
  );
}
