import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { resolveOrbitId, planetTypeLabel } from '@/sim/planet';
import { computeProfile } from '@/sim/planetProfile';
import { generatePlanetaryChemistry } from '@/core/chemistry';
import { generatePlanetaryClimate } from '@/core/climate';
import { generatePlanetaryBiosphere } from '@/core/life';
import { computeEvolutionaryState } from '@/core/evolution';
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

function SectionTitle({ children }: { children: string }) {
  return <div className="field-label mb-1 mt-3">{children}</div>;
}

function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-space-700 bg-space-800/60 p-2.5">{children}</div>;
}

/** A labelled 0..1 progress meter with a colour. */
function Meter({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="py-1">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="field-label">{label}</span>
        <span className="font-mono text-xs text-space-200">{Math.round(value * 100)}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-space-700">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.round(value * 100)}%`, background: color }}
        />
      </div>
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
  const profile = isMoon ? null : computeProfile(planet, star);

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

        {profile && (
          <>
            <SectionTitle>Physical</SectionTitle>
            <Card>
              <Stat label="Mass" value={formatCompact(profile.earthMasses)} unit="M⊕" />
              <Stat label="Gravity" value={profile.gravity.toFixed(2)} unit="g" />
              <Stat label="Density" value={profile.densityRel.toFixed(2)} unit="ρ⊕" />
              <Stat
                label="Rotation"
                value={
                  profile.tidallyLocked
                    ? 'tidally locked'
                    : `${formatCompact(profile.rotationHours)} h`
                }
              />
              <Stat label="Axial tilt" value={profile.axialTilt.toFixed(1)} unit="°" />
            </Card>

            <SectionTitle>Atmosphere</SectionTitle>
            <Card>
              <Stat label="Composition" value={profile.atmosphere.label} />
              <Stat
                label="Pressure"
                value={
                  profile.atmosphere.pressure >= 100
                    ? formatCompact(profile.atmosphere.pressure)
                    : profile.atmosphere.pressure.toFixed(2)
                }
                unit="atm"
              />
              <div className="mt-1.5 flex flex-col gap-1">
                {profile.atmosphere.components.map((c) => (
                  <div key={c.gas} className="flex items-center gap-2">
                    <span className="w-10 font-mono text-[11px] text-space-300">{c.gas}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-space-700">
                      <div
                        className="h-full rounded-full bg-accent/70"
                        style={{ width: `${Math.round(c.fraction * 100)}%` }}
                      />
                    </div>
                    <span className="w-9 text-right font-mono text-[10px] text-space-500">
                      {Math.round(c.fraction * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <SectionTitle>Surface</SectionTitle>
            <Card>
              <Stat label="Biome" value={profile.biome} />
              <Stat label="Surface temp" value={formatCompact(profile.surfaceTemp)} unit="K" />
              <Stat label="Albedo" value={profile.albedo.toFixed(2)} />
              <Meter label="Water coverage" value={profile.waterCoverage} color="#3d7bd9" />
            </Card>

            <SectionTitle>Habitability</SectionTitle>
            <Card>
              <Meter label="Habitability" value={profile.habitability} color="#4fae6b" />
              <Meter label="Life probability" value={profile.lifeProbability} color="#a56cff" />
              <div className="mt-1 flex items-baseline justify-between">
                <span className="field-label">Life potential</span>
                <span className="text-xs font-semibold text-nebula-violet">
                  {profile.lifeLabel}
                </span>
              </div>
            </Card>

            <SectionTitle>Biosphere & Taxonomy</SectionTitle>
            <Card>
              {generatePlanetaryBiosphere(planet, profile).hasLife ? (
                <>
                  <Stat label="Biomass Index" value={String(generatePlanetaryBiosphere(planet, profile).totalBiomassIndex)} unit="/100" />
                  <Stat label="Dominant Domain" value={generatePlanetaryBiosphere(planet, profile).dominantDomain.toUpperCase()} />
                  <Stat label="Estimated Species" value={String(generatePlanetaryBiosphere(planet, profile).speciesCount)} />
                  <div className="mt-2 text-[11px] font-medium text-space-300">Key Organism Taxa</div>
                  <div className="flex flex-col gap-1.5 mt-1">
                    {generatePlanetaryBiosphere(planet, profile).speciesList.map((sp) => (
                      <div key={sp.id} className="flex flex-col rounded bg-space-900/50 px-2 py-1.5 border border-space-700/50">
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-xs font-semibold" style={{ color: sp.color }}>
                            {sp.name} <span className="text-[10px] text-space-400 font-normal uppercase">({sp.domain})</span>
                          </span>
                          <span className="text-[9px] font-mono px-1 rounded bg-space-800 text-space-300 uppercase">{sp.trophicRole.replace('_', ' ')}</span>
                        </div>
                        <div className="text-[10px] text-space-400 mt-0.5">{sp.description}</div>
                        <div className="flex justify-between text-[9px] font-mono text-space-500 mt-1">
                          <span>Complexity: {Math.round(sp.complexity * 100)}%</span>
                          <span>Biomass: {Math.round(sp.biomassFraction * 100)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 border-t border-space-700/60 pt-2">
                    <div className="mb-1 text-[11px] font-medium text-space-300">Evolutionary Dynamics</div>
                    <Stat label="Stage" value={computeEvolutionaryState(planet, profile, generatePlanetaryBiosphere(planet, profile), useUniverseStore.getState().active()?.simTime).evolutionaryStage.replace('_', ' ').toUpperCase()} />
                    <Stat label="Simulated Generations" value={formatCompact(computeEvolutionaryState(planet, profile, generatePlanetaryBiosphere(planet, profile), useUniverseStore.getState().active()?.simTime).generationCount)} />
                    <Meter label="Mutation rate" value={computeEvolutionaryState(planet, profile, generatePlanetaryBiosphere(planet, profile), useUniverseStore.getState().active()?.simTime).mutationRate} color="#f43f5e" />
                    <Meter label="Selection pressure" value={computeEvolutionaryState(planet, profile, generatePlanetaryBiosphere(planet, profile), useUniverseStore.getState().active()?.simTime).selectionPressure} color="#eab308" />
                    <Meter label="Adaptation index" value={computeEvolutionaryState(planet, profile, generatePlanetaryBiosphere(planet, profile), useUniverseStore.getState().active()?.simTime).adaptationIndex} color="#22c55e" />
                  </div>
                </>
              ) : (
                <div className="text-xs text-space-400 py-1">Sterile world. No biological activity detected.</div>
              )}
            </Card>

            <SectionTitle>Resources</SectionTitle>
            <Card>
              <Stat label="Silicates" value={`${Math.round(profile.resources.minerals.silicates * 100)}%`} />
              <Stat label="Ferrous Metals" value={`${Math.round(profile.resources.minerals.ferrousMetals * 100)}%`} />
              <Stat label="Precious Metals" value={`${(profile.resources.minerals.preciousMetals * 100).toFixed(1)}%`} />
              <Stat label="Fissiles / Heavies" value={`${(profile.resources.minerals.heavyElements * 100).toFixed(2)}%`} />
              <Meter label="Water Ice" value={profile.resources.liquids.waterIce} color="#60a5fa" />
              <Meter label="Liquid Water" value={profile.resources.liquids.liquidWater} color="#3b82f6" />
              <Meter label="Hydrocarbons" value={profile.resources.liquids.hydrocarbons} color="#f59e0b" />
              <Stat label="Hydrogen / Helium" value={`${Math.round((profile.resources.gases.hydrogen + profile.resources.gases.helium) * 100)}%`} />
              <Stat label="Solar Irradiance" value={formatCompact(profile.resources.energy.solarIrradiance)} unit="W/m²" />
              <Stat label="Geothermal Potential" value={String(profile.resources.energy.geothermalEnergy)} unit="/100" />
            </Card>

            <SectionTitle>Climate & Weather</SectionTitle>
            <Card>
              <Meter label="Cloud cover" value={generatePlanetaryClimate(planet, profile, useUniverseStore.getState().active()?.simTime).cloudCover} color="#94a3b8" />
              <Meter label="Humidity" value={generatePlanetaryClimate(planet, profile, useUniverseStore.getState().active()?.simTime).humidity} color="#38bdf8" />
              <Stat label="Precipitation" value={generatePlanetaryClimate(planet, profile, useUniverseStore.getState().active()?.simTime).precipitationType.replace('_', ' ').toUpperCase()} />
              <Stat label="Wind speed" value={`${generatePlanetaryClimate(planet, profile, useUniverseStore.getState().active()?.simTime).windSpeedKmh} km/h`} />
              <Stat label="Atmospheric circulation" value={generatePlanetaryClimate(planet, profile, useUniverseStore.getState().active()?.simTime).windPattern.replace('_', ' ')} />
              <Stat
                label="Thermal range"
                value={`${generatePlanetaryClimate(planet, profile, useUniverseStore.getState().active()?.simTime).temperatureRange.min}K — ${generatePlanetaryClimate(planet, profile, useUniverseStore.getState().active()?.simTime).temperatureRange.max}K`}
              />
              <Stat label="Seasonal variance" value={`±${generatePlanetaryClimate(planet, profile, useUniverseStore.getState().active()?.simTime).seasonalDeltaK} K`} />
            </Card>

            <SectionTitle>Chemistry & Compounds</SectionTitle>
            <Card>
              <div className="mb-2 text-[11px] font-medium text-space-300">Elemental Abundance</div>
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                {generatePlanetaryChemistry(planet, profile).elements.slice(0, 6).map((el) => (
                  <div key={el.symbol} className="flex items-center justify-between rounded bg-space-900/60 px-2 py-1 border border-space-700/50">
                    <span className="font-mono text-xs font-semibold" style={{ color: el.color }}>
                      {el.symbol} <span className="text-[10px] text-space-400 font-normal">{el.name}</span>
                    </span>
                    <span className="font-mono text-xs text-space-300">{(el.abundance * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>

              <div className="mb-2 text-[11px] font-medium text-space-300">Primary Compounds</div>
              <div className="flex flex-col gap-1.5 mb-3">
                {generatePlanetaryChemistry(planet, profile).compounds.map((cmp) => (
                  <div key={cmp.formula} className="flex flex-col rounded bg-space-900/40 px-2 py-1 border border-space-700/40">
                    <div className="flex justify-between items-baseline">
                      <span className="font-mono text-xs text-accent font-semibold">{cmp.formula} <span className="text-[11px] text-space-300 font-normal">({cmp.name})</span></span>
                      <span className="font-mono text-[10px] text-space-400 uppercase">{cmp.state} · {(cmp.fraction * 100).toFixed(1)}%</span>
                    </div>
                    <div className="text-[10px] text-space-500 mt-0.5">{cmp.description}</div>
                  </div>
                ))}
              </div>

              {generatePlanetaryChemistry(planet, profile).reactions.length > 0 && (
                <>
                  <div className="mb-2 text-[11px] font-medium text-space-300">Active Chemical Reactions</div>
                  <div className="flex flex-col gap-1.5">
                    {generatePlanetaryChemistry(planet, profile).reactions.map((rxn) => (
                      <div key={rxn.id} className="flex flex-col rounded bg-space-900/40 px-2 py-1.5 border border-space-700/40">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-xs text-space-200 font-medium">{rxn.name}</span>
                          <span className="text-[9px] font-mono px-1 rounded bg-space-800 text-space-400 uppercase">{rxn.energyDelta}</span>
                        </div>
                        <div className="font-mono text-[11px] text-accent/90">
                          {rxn.reactants.join(' + ')} ➔ {rxn.products.join(' + ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>

            {profile.resources.deposits.length > 0 && (
              <>
                <SectionTitle>Major Deposits</SectionTitle>
                <div className="flex flex-col gap-1.5">
                  {profile.resources.deposits.map((dep) => (
                    <Card key={dep.id}>
                      <div className="flex items-center justify-between text-xs font-semibold text-space-200">
                        <span>{dep.name}</span>
                        <span className="rounded bg-space-700 px-1.5 py-0.5 font-mono text-[10px] text-accent-soft capitalize">
                          {dep.category}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] leading-tight text-space-400">
                        {dep.description}
                      </div>
                      <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] text-space-300">
                        <span>Reserves: {formatCompact(dep.reserveUnits)} units</span>
                        <span>Access: {Math.round(dep.accessibility * 100)}%</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </>
        )}

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
