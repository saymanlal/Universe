import { motion } from 'framer-motion';
import { resolveOrbitId, planetTypeLabel } from '@/sim/planet';
import { formatCompact, YEAR_SECONDS } from '@/core/format';
import { SYS_FRAME } from '@/canvas/viewport';
import { useUniverseStore } from '@/state/useUniverseStore';
import { CrosshairIcon, StarIcon } from '@/components/icons';

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

/** Inspector body for a selected planet or moon (resolved deterministically). */
export function PlanetInspector({ id }: { id: string }) {
  const setCamera = useUniverseStore((s) => s.setCamera);
  const setSelection = useUniverseStore((s) => s.setSelection);
  const resolved = resolveOrbitId(id);

  if (!resolved) {
    return <div className="p-3 text-xs text-space-400">Body could not be resolved.</div>;
  }

  const { star, planet, moon } = resolved;
  const isMoon = moon !== null;
  const color = hex(isMoon ? moon.color : planet.color);
  const title = isMoon ? moon.name : planet.name;

  const frameSystem = () => setCamera({ x: star.x, y: star.y, zoom: SYS_FRAME });

  return (
    <div className="p-3">
      <motion.div
        key={id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="mb-3 flex items-center gap-3">
          <div
            className="shrink-0 rounded-full"
            style={{
              width: isMoon ? 26 : 38,
              height: isMoon ? 26 : 38,
              background: `radial-gradient(circle at 34% 32%, #ffffffcc, ${color} 60%, rgba(0,0,0,0.5))`,
              boxShadow: `0 0 14px ${color}66`,
            }}
          />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{title}</div>
            <div className="font-mono text-[11px] text-space-400">
              {isMoon ? `Moon · orbits ${planet.name}` : `${planetTypeLabel(planet.type)} · ${star.name ?? star.designation}`}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-space-700 bg-space-800/60 p-2.5">
          {isMoon ? (
            <>
              <Stat label="Orbit radius" value={formatCompact(moon.orbitRadius)} unit="u" />
              <Stat label="Orbital period" value={`${(moon.period / 86400).toFixed(1)}`} unit="days" />
              <Stat label="Size" value={moon.radius.toFixed(2)} unit="u" />
              <Stat label="Parent" value={planet.name} />
            </>
          ) : (
            <>
              <Stat label="Type" value={planetTypeLabel(planet.type)} />
              <Stat label="Distance" value={planet.distanceAU.toFixed(3)} unit="AU" />
              <Stat label="Orbital period" value={formatCompact(planet.period / YEAR_SECONDS)} unit="yr" />
              <Stat label="Radius" value={planet.earthRadii.toFixed(2)} unit="R⊕" />
              <Stat label="Temperature" value={formatCompact(planet.temperature)} unit="K" />
              <Stat label="Moons" value={String(planet.moons.length)} />
            </>
          )}
        </div>

        <div className="mt-3 flex gap-2">
          <button className="btn btn-primary flex-1 justify-center" onClick={frameSystem}>
            <CrosshairIcon width={14} height={14} />
            Frame system
          </button>
          <button
            className="btn justify-center"
            title="Select parent star"
            onClick={() =>
              setSelection({
                kind: 'star',
                id: star.id,
                label: star.name ?? star.designation,
                position: { x: star.x, y: star.y },
              })
            }
          >
            <StarIcon width={14} height={14} />
            Star
          </button>
        </div>

        {!isMoon && planet.moons.length > 0 && (
          <div className="mt-3">
            <div className="field-label mb-1">Moons</div>
            <div className="flex flex-col gap-1">
              {planet.moons.map((m) => (
                <button
                  key={m.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1 text-left text-xs text-space-300 hover:bg-space-700"
                  onClick={() =>
                    setSelection({ kind: 'moon', id: m.id, label: m.name, position: { x: star.x, y: star.y } })
                  }
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: hex(m.color) }} />
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
