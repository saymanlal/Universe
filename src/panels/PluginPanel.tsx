import { AnimatePresence, motion } from 'framer-motion';
import { usePluginStore } from '@/state/usePluginStore';
import { useUiStore } from '@/state/useUiStore';
import { CloseIcon, ZapIcon, CheckIcon, AlertIcon } from '@/components/icons';

/**
 * Plugin Manager panel — lists registered plugins with their status, and lets
 * the administrator activate / deactivate them.  New plugins are registered
 * programmatically via `usePluginStore.getState().register(descriptor)`.
 */
export function PluginPanel() {
  const open = useUiStore((s) => s.pluginPanelOpen);
  const setOpen = useUiStore((s) => s.setPluginPanelOpen);
  const plugins = usePluginStore((s) => s.plugins);
  const toggle = usePluginStore((s) => s.toggle);

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
            className="panel flex w-[520px] max-w-full flex-col overflow-hidden"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="panel-header">
              <span className="flex items-center gap-1.5 text-sm normal-case tracking-normal text-white">
                <ZapIcon width={15} height={15} className="text-accent" />
                Plugin Manager
                <span className="ml-1 rounded bg-space-700 px-1.5 py-0.5 text-[10px] text-space-400">
                  {plugins.length}
                </span>
              </span>
              <button className="btn btn-icon" onClick={() => setOpen(false)}>
                <CloseIcon width={15} height={15} />
              </button>
            </div>

            {/* Plugin list */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              {plugins.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <ZapIcon width={32} height={32} className="text-space-600" />
                  <p className="text-sm text-space-400">No plugins registered yet.</p>
                  <p className="text-xs text-space-500 max-w-xs">
                    Plugins extend the engine without modifying its core. Register
                    one via{' '}
                    <code className="rounded bg-space-800 px-1 py-0.5 font-mono text-accent">
                      usePluginStore.getState().register(descriptor)
                    </code>{' '}
                    from the browser console or a script module.
                  </p>
                </div>
              ) : (
                plugins.map((entry) => (
                  <motion.div
                    key={entry.descriptor.id}
                    layout
                    className="flex items-start gap-3 rounded-lg border border-space-700 bg-space-850 p-3"
                  >
                    {/* Status dot */}
                    <div
                      className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                        entry.error
                          ? 'bg-rose-400'
                          : entry.active
                          ? 'bg-emerald-400'
                          : 'bg-space-600'
                      }`}
                    />

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white truncate">
                          {entry.descriptor.name}
                        </span>
                        <span className="text-[10px] text-space-500 font-mono shrink-0">
                          v{entry.descriptor.version}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-space-400 leading-relaxed">
                        {entry.descriptor.description}
                      </p>
                      {entry.descriptor.author && (
                        <p className="mt-0.5 text-[10px] text-space-500">
                          by {entry.descriptor.author}
                        </p>
                      )}
                      {entry.error && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-rose-400">
                          <AlertIcon width={12} height={12} />
                          {entry.error}
                        </p>
                      )}
                    </div>

                    {/* Toggle */}
                    <button
                      className={`btn shrink-0 gap-1.5 ${
                        entry.active ? 'text-emerald-400' : 'text-space-400'
                      }`}
                      onClick={() => void toggle(entry.descriptor.id)}
                      title={entry.active ? 'Deactivate plugin' : 'Activate plugin'}
                    >
                      <CheckIcon width={13} height={13} />
                      {entry.active ? 'Active' : 'Inactive'}
                    </button>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-space-700 px-3 py-2 text-[11px] text-space-500">
              Plugins run entirely in the browser — no backend required.
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
