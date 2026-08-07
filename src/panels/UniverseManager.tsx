import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUniverseStore } from '@/state/useUniverseStore';
import { useUiStore } from '@/state/useUiStore';
import { snapshotCounts } from '@/db/database';
import { parseSeedInput, hashString } from '@/core/rng';
import { createId } from '@/core/ids';
import { formatSimTime } from '@/core/format';
import type { Universe } from '@/core/types';
import {
  CloseIcon,
  CopyIcon,
  DiceIcon,
  GalaxyIcon,
  LayersIcon,
  OpenIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from '@/components/icons';

type SortKey = 'updated' | 'created' | 'name';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'updated', label: 'Last edited' },
  { key: 'created', label: 'Created' },
  { key: 'name', label: 'Name' },
];

function seedPreview(text: string): string {
  const s = parseSeedInput(text);
  return s === null ? 'random' : `0x${s.toString(16)}`;
}

/**
 * The Universe Manager: the home for creating, switching, renaming, cloning,
 * branching-source, and deleting universes. Each universe is a tiny record
 * (seeds + edits) persisted in IndexedDB, so the library scales freely.
 */
export function UniverseManager() {
  const open = useUiStore((s) => s.managerOpen);
  const setOpen = useUiStore((s) => s.setManagerOpen);

  const universes = useUniverseStore((s) => s.universes);
  const activeId = useUniverseStore((s) => s.activeId);
  const createUniverse = useUniverseStore((s) => s.createUniverse);
  const setActive = useUniverseStore((s) => s.setActive);
  const deleteUniverse = useUniverseStore((s) => s.deleteUniverse);
  const renameUniverse = useUniverseStore((s) => s.renameUniverse);
  const duplicateUniverse = useUniverseStore((s) => s.duplicateUniverse);

  const [name, setName] = useState('');
  const [seed, setSeed] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('updated');
  const [counts, setCounts] = useState<Record<string, number>>({});

  // inline rename + delete-confirm state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) void snapshotCounts().then(setCounts);
  }, [open, universes.length]);

  useEffect(() => {
    if (renamingId) renameRef.current?.focus();
  }, [renamingId]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? universes.filter(
          (u) =>
            u.name.toLowerCase().includes(q) ||
            u.seed.toString(16).includes(q) ||
            String(u.seed).includes(q),
        )
      : universes;
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'created') return b.createdAt - a.createdAt;
      return b.updatedAt - a.updatedAt;
    });
    return sorted;
  }, [universes, search, sort]);

  const handleCreate = async () => {
    await createUniverse(name, seed);
    setName('');
    setSeed('');
    setOpen(false);
  };

  const startRename = (u: Universe) => {
    setRenamingId(u.id);
    setNameDraft(u.name);
  };
  const commitRename = () => {
    if (renamingId) void renameUniverse(renamingId, nameDraft);
    setRenamingId(null);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            className="panel flex max-h-[88vh] w-[760px] max-w-full flex-col overflow-hidden"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-header">
              <span className="flex items-center gap-1.5 text-sm normal-case tracking-normal text-white">
                <GalaxyIcon width={15} height={15} className="text-accent" />
                Universe Manager
                <span className="ml-1 rounded bg-space-700 px-1.5 py-0.5 text-[10px] text-space-400">
                  {universes.length}
                </span>
              </span>
              <button className="btn btn-icon" onClick={() => setOpen(false)}>
                <CloseIcon width={15} height={15} />
              </button>
            </div>

            {/* create form */}
            <div className="border-b border-space-700 p-3">
              <div className="flex items-end gap-2">
                <label className="flex flex-1 flex-col gap-1">
                  <span className="field-label">Name</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Andromeda Sandbox"
                    className="rounded-md border border-space-600 bg-space-800 px-2 py-1.5 text-sm text-white outline-none placeholder:text-space-500 focus:border-accent"
                  />
                </label>
                <label className="flex flex-1 flex-col gap-1">
                  <span className="field-label">Seed (word or number)</span>
                  <div className="flex items-center gap-1">
                    <input
                      value={seed}
                      onChange={(e) => setSeed(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && void handleCreate()}
                      placeholder="random if empty"
                      className="w-full rounded-md border border-space-600 bg-space-800 px-2 py-1.5 font-mono text-sm text-white outline-none placeholder:text-space-500 focus:border-accent"
                    />
                    <button
                      className="btn btn-icon shrink-0"
                      title="Randomize seed"
                      onClick={() => setSeed(String(hashString(createId('seed'))))}
                    >
                      <DiceIcon width={15} height={15} />
                    </button>
                  </div>
                </label>
                <button className="btn btn-primary h-[34px] px-3" onClick={() => void handleCreate()}>
                  <PlusIcon width={15} height={15} />
                  Create
                </button>
              </div>
              <div className="mt-1.5 font-mono text-[10px] text-space-500">
                resolves to seed <span className="text-accent-soft">{seedPreview(seed)}</span>
              </div>
            </div>

            {/* search + sort */}
            <div className="flex items-center gap-2 border-b border-space-700 px-3 py-2">
              <div className="relative flex-1">
                <SearchIcon
                  width={14}
                  height={14}
                  className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-space-500"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or seed…"
                  className="w-full rounded-md border border-space-600 bg-space-800 py-1.5 pl-7 pr-2 text-sm text-white outline-none placeholder:text-space-500 focus:border-accent"
                />
              </div>
              <div className="flex items-center gap-1">
                {SORTS.map((s) => (
                  <button
                    key={s.key}
                    className={`btn px-2 ${sort === s.key ? 'text-white' : ''}`}
                    onClick={() => setSort(s.key)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* library */}
            <div className="min-h-0 flex-1 overflow-auto p-3">
              {visible.length === 0 ? (
                <div className="py-12 text-center text-sm text-space-400">
                  {universes.length === 0
                    ? 'No universes yet. Create one above to begin.'
                    : 'No universes match your search.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {visible.map((u) => {
                    const isActive = u.id === activeId;
                    const isRenaming = renamingId === u.id;
                    const isConfirming = confirmId === u.id;
                    return (
                      <motion.div
                        key={u.id}
                        layout
                        className={`group relative flex flex-col gap-2 rounded-lg border p-3 transition-colors ${
                          isActive
                            ? 'border-accent/60 bg-accent/10'
                            : 'border-space-700 bg-space-800 hover:border-space-500'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-space-900 text-accent">
                            <GalaxyIcon width={18} height={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            {isRenaming ? (
                              <input
                                ref={renameRef}
                                value={nameDraft}
                                onChange={(e) => setNameDraft(e.target.value)}
                                onBlur={commitRename}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitRename();
                                  if (e.key === 'Escape') setRenamingId(null);
                                }}
                                className="w-full rounded border border-accent bg-space-900 px-1.5 py-0.5 text-sm text-white outline-none"
                              />
                            ) : (
                              <div
                                className="truncate text-sm font-medium text-white"
                                onDoubleClick={() => startRename(u)}
                                title="Double-click to rename"
                              >
                                {u.name}
                              </div>
                            )}
                            <div className="mt-0.5 flex flex-wrap gap-x-2 font-mono text-[10px] text-space-500">
                              <span title="Universe seed">
                                seed <span className="text-space-400">0x{u.seed.toString(16)}</span>
                              </span>
                              <span title="Timeline seed">
                                tl{' '}
                                <span className="text-nebula-violet/80">
                                  0x{u.timelineSeed.toString(16)}
                                </span>
                              </span>
                            </div>
                          </div>
                          {isActive && (
                            <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] text-accent-soft">
                              active
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-space-500">
                          <span>{new Date(u.updatedAt).toLocaleDateString()}</span>
                          <span className="font-mono">{formatSimTime(u.simTime)}</span>
                          <span className="flex items-center gap-1">
                            <LayersIcon width={11} height={11} />
                            {counts[u.id] ?? 0}
                          </span>
                        </div>

                        {/* actions */}
                        {isConfirming ? (
                          <div className="flex items-center gap-2 rounded-md bg-rose-500/10 p-1.5 text-xs">
                            <span className="flex-1 text-rose-200">Delete permanently?</span>
                            <button
                              className="btn bg-rose-500/80 text-white hover:bg-rose-500"
                              onClick={() => {
                                void deleteUniverse(u.id);
                                setConfirmId(null);
                              }}
                            >
                              Delete
                            </button>
                            <button className="btn" onClick={() => setConfirmId(null)}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              className="btn btn-primary flex-1 justify-center py-1"
                              onClick={() => {
                                void setActive(u.id);
                                setOpen(false);
                              }}
                              disabled={isActive}
                            >
                              <OpenIcon width={13} height={13} />
                              {isActive ? 'Current' : 'Open'}
                            </button>
                            <button className="btn btn-icon" title="Rename" onClick={() => startRename(u)}>
                              <PencilIcon width={14} height={14} />
                            </button>
                            <button
                              className="btn btn-icon"
                              title="Duplicate"
                              onClick={() => void duplicateUniverse(u.id)}
                            >
                              <CopyIcon width={14} height={14} />
                            </button>
                            <button
                              className="btn btn-icon text-rose-300 hover:bg-rose-500/15 hover:text-rose-200"
                              title="Delete"
                              onClick={() => setConfirmId(u.id)}
                            >
                              <TrashIcon width={14} height={14} />
                            </button>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
