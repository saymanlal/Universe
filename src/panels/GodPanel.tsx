import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useUniverseStore } from '@/state/useUniverseStore';
import { useUiStore } from '@/state/useUiStore';
import {
  CrosshairIcon,
  HomeIcon,
  PlusIcon,
  TrashIcon,
  WandIcon,
  LayersIcon,
} from '@/components/icons';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-space-700 px-3 py-3 last:border-b-0">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-space-400">
        {title}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

/**
 * The God Panel — the administrator's primary toolbox. Every control here is
 * wired to a real store/DB action; capabilities that require later generation
 * phases (spawning stars/planets/life) are added to their own sections as
 * those phases land.
 */
export function GodPanel() {
  const active = useUniverseStore((s) => s.active());
  const createUniverse = useUniverseStore((s) => s.createUniverse);
  const deleteUniverse = useUniverseStore((s) => s.deleteUniverse);
  const branchTimeline = useUniverseStore((s) => s.branchTimeline);
  const captureSnapshot = useUniverseStore((s) => s.captureSnapshot);
  const setCamera = useUniverseStore((s) => s.setCamera);
  const setManagerOpen = useUiStore((s) => s.setManagerOpen);

  const [tx, setTx] = useState('0');
  const [ty, setTy] = useState('0');
  const [snapNote, setSnapNote] = useState('');

  const teleport = () => {
    const x = Number(tx);
    const y = Number(ty);
    if (Number.isFinite(x) && Number.isFinite(y)) setCamera({ x, y });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="panel-header">
        <span className="flex items-center gap-1.5">
          <WandIcon width={13} height={13} className="text-accent" />
          God Tools
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        <Section title="Universe">
          <button className="btn btn-primary w-full justify-start" onClick={() => void createUniverse()}>
            <PlusIcon width={14} height={14} />
            Create universe
          </button>
          <button className="btn w-full justify-start" onClick={() => setManagerOpen(true)}>
            <LayersIcon width={14} height={14} />
            Universe manager…
          </button>
          {active && (
            <button
              className="btn w-full justify-start text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
              onClick={() => void deleteUniverse(active.id)}
            >
              <TrashIcon width={14} height={14} />
              Delete “{active.name}”
            </button>
          )}
        </Section>

        {active ? (
          <>
            <Section title="Teleport">
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="field-label">X</span>
                  <input
                    value={tx}
                    onChange={(e) => setTx(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && teleport()}
                    className="w-full rounded-md border border-space-600 bg-space-800 px-2 py-1 font-mono text-xs text-white outline-none focus:border-accent"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="field-label">Y</span>
                  <input
                    value={ty}
                    onChange={(e) => setTy(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && teleport()}
                    className="w-full rounded-md border border-space-600 bg-space-800 px-2 py-1 font-mono text-xs text-white outline-none focus:border-accent"
                  />
                </label>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-primary flex-1 justify-center" onClick={teleport}>
                  <CrosshairIcon width={14} height={14} />
                  Go
                </button>
                <button
                  className="btn flex-1 justify-center"
                  onClick={() => setCamera({ x: 0, y: 0, zoom: 1 })}
                >
                  <HomeIcon width={14} height={14} />
                  Genesis
                </button>
              </div>
            </Section>

            <Section title="Timeline & Experiments">
              <button className="btn w-full justify-start" onClick={() => void branchTimeline(active.id)}>
                <WandIcon width={14} height={14} />
                Branch timeline
              </button>
              <input
                value={snapNote}
                onChange={(e) => setSnapNote(e.target.value)}
                placeholder="Snapshot label (optional)"
                className="w-full rounded-md border border-space-600 bg-space-800 px-2 py-1 text-xs text-white outline-none placeholder:text-space-500 focus:border-accent"
              />
              <button
                className="btn w-full justify-start"
                onClick={() => {
                  void captureSnapshot(snapNote);
                  setSnapNote('');
                }}
              >
                <LayersIcon width={14} height={14} />
                Capture snapshot
              </button>
            </Section>

            <Section title="Determinism">
              <motion.div
                key={active.seed}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-md border border-space-700 bg-space-800 p-2 font-mono text-[11px] leading-relaxed text-space-400"
              >
                <div>
                  seed <span className="text-accent-soft">0x{active.seed.toString(16)}</span>
                </div>
                <div>
                  timeline <span className="text-nebula-violet">0x{active.timelineSeed.toString(16)}</span>
                </div>
                <div className="mt-1 text-space-500">
                  The entire cosmos is a pure function of these seeds.
                </div>
              </motion.div>
            </Section>
          </>
        ) : (
          <div className="p-3 text-xs text-space-400">
            Create a universe to unlock God tools.
          </div>
        )}
      </div>
    </div>
  );
}
