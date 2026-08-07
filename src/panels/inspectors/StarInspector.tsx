import { motion } from 'framer-motion';
import { findStarById } from '@/sim/starfield';
import { spectralType, type Star } from '@/sim/star';
import { generateSystem, planetTypeLabel } from '@/sim/planet';
import { formatCompact } from '@/core/format';
import { SYS_FRAME } from '@/canvas/viewport';
import { useUniverseStore } from '@/state/useUniverseStore';
import { CrosshairIcon, PlanetIcon } from '@/components/icons';

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
  const setSelection = useUniverseStore((s) => s.setSelection);
  const star: Star | null = findStarById(id);

  if (!star) {
    return <div className="p-3 text-xs text-space-400">Star could not be resolved.</div>;
  }

  const color = hex(star.color);
  const planets = generateSystem(star);

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
          onClick={() => setCamera({ x: star.x, y: star.y, zoom: SYS_FRAME })}
        >
          <CrosshairIcon width={14} height={14} />
          {planets.length > 0 ? 'Enter system' : 'Focus star'}
        </button>

        <div className="mt-3">
          <div className="field-label mb-1">
            System · {planets.length} {planets.length === 1 ? 'planet' : 'planets'}
          </div>
          {planets.length === 0 ? (
            <p className="text-[11px] text-space-500">No planets orbit this star.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {planets.map((p) => (
                <button
                  key={p.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-space-700"
                  onClick={() => {
                    setCamera({ x: star.x, y: star.y, zoom: SYS_FRAME });
                    setSelection({ kind: 'planet', id: p.id, label: p.name, position: { x: star.x, y: star.y } });
                  }}
                >
                  <PlanetIcon width={13} height={13} style={{ color: hex(p.color) }} />
                  <span className="flex-1 truncate text-xs text-space-200">{p.name}</span>
                  <span className="font-mono text-[10px] text-space-500">
                    {planetTypeLabel(p.type)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-space-500">
          This star and its planets are generated on demand from the universe seed — nothing is
          stored. Zoom in to watch the planets orbit as the simulation clock advances.
        </p>
      </motion.div>
    </div>
  );
}
