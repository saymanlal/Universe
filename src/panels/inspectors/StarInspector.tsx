import { motion } from 'framer-motion';
import { findStarById } from '@/sim/starfield';
import { spectralType, type Star } from '@/sim/star';
import { formatCompact } from '@/core/format';
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

/** Inspector body for a selected star, resolved deterministically by id. */
export function StarInspector({ id }: { id: string }) {
  const setCamera = useUniverseStore((s) => s.setCamera);
  const star: Star | null = findStarById(id);

  if (!star) {
    return <div className="p-3 text-xs text-space-400">Star could not be resolved.</div>;
  }

  const color = hex(star.color);

  return (
    <div className="p-3">
      <motion.div
        key={star.id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="mb-3 flex items-center gap-3">
          <div
            className="h-10 w-10 shrink-0 rounded-full"
            style={{
              background: `radial-gradient(circle at 35% 35%, #fff, ${color} 55%, rgba(0,0,0,0.4))`,
              boxShadow: `0 0 18px 2px ${color}88`,
            }}
          />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">
              {star.name ?? star.designation}
            </div>
            <div className="font-mono text-[11px] text-space-400">
              {star.name ? star.designation : spectralType(star)} · {spectralType(star)}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-space-700 bg-space-800/60 p-2.5">
          <Stat label="Spectral" value={`${star.spectral}${star.subclass}`} />
          <Stat label="Temperature" value={formatCompact(star.temperature)} unit="K" />
          <Stat label="Mass" value={star.mass.toFixed(3)} unit="M☉" />
          <Stat label="Radius" value={star.radius.toFixed(3)} unit="R☉" />
          <Stat label="Luminosity" value={formatCompact(star.luminosity)} unit="L☉" />
          <Stat label="Color" value={color} />
          <Stat
            label="Position"
            value={`${formatCompact(star.x)}, ${formatCompact(star.y)}`}
          />
        </div>

        <button
          className="btn btn-primary mt-3 w-full justify-center"
          onClick={() => setCamera({ x: star.x, y: star.y, zoom: 4 })}
        >
          <CrosshairIcon width={14} height={14} />
          Focus star
        </button>

        <p className="mt-3 text-[11px] leading-relaxed text-space-500">
          This star is generated on demand from the universe seed and its grid position — it is
          not stored. Solar systems, planets and moons unfold here in later phases.
        </p>
      </motion.div>
    </div>
  );
}
