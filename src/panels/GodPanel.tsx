import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useUniverseStore } from '@/state/useUniverseStore';
import { useUiStore } from '@/state/useUiStore';
import { useEditsStore } from '@/state/useEditsStore';
import {
  CrosshairIcon,
  HomeIcon,
  PlusIcon,
  TrashIcon,
  WandIcon,
  LayersIcon,
  StarIcon,
  CopyIcon,
  MoveIcon,
  UndoIcon,
  RedoIcon,
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
  const selection = useUniverseStore((s) => s.selection);
  const selections = useUniverseStore((s) => s.selections);
  const setManagerOpen = useUiStore((s) => s.setManagerOpen);
  const godTool = useUiStore((s) => s.godTool);
  const setGodTool = useUiStore((s) => s.setGodTool);

  const deleteStars = useEditsStore((s) => s.deleteStars);
  const cloneStars = useEditsStore((s) => s.cloneStars);
  const undo = useEditsStore((s) => s.undo);
  const redo = useEditsStore((s) => s.redo);
  const canUndo = useEditsStore((s) => s.undoStack.length > 0);
  const canRedo = useEditsStore((s) => s.redoStack.length > 0);

  const [tx, setTx] = useState('0');
  const [ty, setTy] = useState('0');
  const [snapNote, setSnapNote] = useState('');

  const teleport = () => {
    const x = Number(tx);
    const y = Number(ty);
    if (Number.isFinite(x) && Number.isFinite(y)) setCamera({ x, y });
  };

  const starIds = selections.filter((s) => s.kind === 'star').map((s) => s.id);
  const seed = active?.seed ?? 0;

  const teleportToSelection = () => {
    if (selection?.position) setCamera({ x: selection.position.x, y: selection.position.y });
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
            <Section title="God Tools">
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={`btn justify-start ${godTool === 'spawn' ? 'btn-primary' : ''}`}
                  onClick={() => setGodTool(godTool === 'spawn' ? 'none' : 'spawn')}
                  title="Click the canvas to place a new star"
                >
                  <StarIcon width={14} height={14} />
                  Spawn
                </button>
                <button
                  className={`btn justify-start ${godTool === 'move' ? 'btn-primary' : ''}`}
                  disabled={selection?.kind !== 'star'}
                  onClick={() => setGodTool(godTool === 'move' ? 'none' : 'move')}
                  title="Click the canvas to move the selected star"
                >
                  <MoveIcon width={14} height={14} />
                  Move
                </button>
                <button
                  className="btn justify-start"
                  disabled={starIds.length === 0}
                  onClick={() => cloneStars(starIds, seed)}
                >
                  <CopyIcon width={14} height={14} />
                  Clone
                </button>
                <button
                  className="btn justify-start text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
                  disabled={starIds.length === 0}
                  onClick={() => deleteStars(starIds)}
                >
                  <TrashIcon width={14} height={14} />
                  Delete
                </button>
              </div>

              {godTool !== 'none' && (
                <div className="rounded-md border border-accent/40 bg-accent/10 px-2 py-1.5 text-[11px] text-accent-soft">
                  {godTool === 'spawn'
                    ? 'Click the canvas to place a star.'
                    : 'Click the canvas to move the selected star.'}{' '}
                  <span className="kbd">Esc</span> to cancel.
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-space-400">
                  {selections.length === 0
                    ? 'Nothing selected'
                    : `${selections.length} selected${starIds.length !== selections.length ? ` · ${starIds.length} star(s)` : ''}`}
                </span>
                <button
                  className="btn px-2"
                  disabled={!selection?.position}
                  onClick={teleportToSelection}
                >
                  <CrosshairIcon width={13} height={13} />
                  Focus
                </button>
              </div>

              <div className="flex gap-2">
                <button className="btn flex-1 justify-center" disabled={!canUndo} onClick={undo}>
                  <UndoIcon width={14} height={14} />
                  Undo
                </button>
                <button className="btn flex-1 justify-center" disabled={!canRedo} onClick={redo}>
                  <RedoIcon width={14} height={14} />
                  Redo
                </button>
              </div>
              <p className="text-[10px] leading-relaxed text-space-500">
                Shift/Ctrl-click adds to the selection. Spawns and deletions persist locally per
                universe; procedural stars you move become editable copies.
              </p>
            </Section>

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
