import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUniverseStore } from '@/state/useUniverseStore';
import { useUiStore } from '@/state/useUiStore';
import { CloseIcon, GalaxyIcon, PlusIcon, TrashIcon } from '@/components/icons';

/**
 * The Universe Manager: create, switch, and delete universes. Each universe is
 * a tiny record (seeds + edits), so the library scales to any number of
 * universes without cost.
 */
export function UniverseManager() {
  const open = useUiStore((s) => s.managerOpen);
  const setOpen = useUiStore((s) => s.setManagerOpen);

  const universes = useUniverseStore((s) => s.universes);
  const activeId = useUniverseStore((s) => s.activeId);
  const createUniverse = useUniverseStore((s) => s.createUniverse);
  const setActive = useUniverseStore((s) => s.setActive);
  const deleteUniverse = useUniverseStore((s) => s.deleteUniverse);

  const [name, setName] = useState('');
  const [seed, setSeed] = useState('');

  const handleCreate = async () => {
    await createUniverse(name, seed);
    setName('');
    setSeed('');
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            className="panel w-[640px] max-w-[92vw] overflow-hidden"
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
              </span>
              <button className="btn btn-icon" onClick={() => setOpen(false)}>
                <CloseIcon width={15} height={15} />
              </button>
            </div>

            {/* create form */}
            <div className="flex items-end gap-2 border-b border-space-700 p-3">
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
                <input
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void handleCreate()}
                  placeholder="random if empty"
                  className="rounded-md border border-space-600 bg-space-800 px-2 py-1.5 font-mono text-sm text-white outline-none placeholder:text-space-500 focus:border-accent"
                />
              </label>
              <button className="btn btn-primary h-[34px] px-3" onClick={() => void handleCreate()}>
                <PlusIcon width={15} height={15} />
                Create
              </button>
            </div>

            {/* library */}
            <div className="max-h-[46vh] overflow-auto p-3">
              {universes.length === 0 ? (
                <div className="py-10 text-center text-sm text-space-400">
                  No universes yet. Create one above to begin.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {universes.map((u) => {
                    const isActive = u.id === activeId;
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
                        <button
                          className="flex items-center gap-2 text-left"
                          onClick={() => {
                            void setActive(u.id);
                            setOpen(false);
                          }}
                        >
                          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-space-900 text-accent">
                            <GalaxyIcon width={16} height={16} />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-white">{u.name}</div>
                            <div className="font-mono text-[10px] text-space-400">
                              0x{u.seed.toString(16)}
                            </div>
                          </div>
                        </button>
                        <div className="flex items-center justify-between text-[10px] text-space-500">
                          <span>{new Date(u.updatedAt).toLocaleDateString()}</span>
                          {isActive && <span className="text-accent-soft">active</span>}
                        </div>
                        <button
                          className="absolute right-2 top-2 hidden rounded p-1 text-space-400 hover:bg-rose-500/15 hover:text-rose-300 group-hover:block"
                          title="Delete universe"
                          onClick={() => void deleteUniverse(u.id)}
                        >
                          <TrashIcon width={14} height={14} />
                        </button>
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
