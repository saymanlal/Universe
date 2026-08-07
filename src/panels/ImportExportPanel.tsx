import { useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUiStore } from '@/state/useUiStore';
import { useUniverseStore } from '@/state/useUniverseStore';
import { exportUniverse, exportAllUniverses, importUniverse } from '@/core/importExport';
import { CloseIcon, DownloadIcon, UploadIcon, PackageIcon } from '@/components/icons';

export function ImportExportPanel() {
  const open = useUiStore((s) => s.importExportOpen);
  const setOpen = useUiStore((s) => s.setImportExportOpen);
  const activeId = useUniverseStore((s) => s.activeId);
  const setActive = useUniverseStore((s) => s.setActive);

  const [isDragging, setIsDragging] = useState(false);
  const [importState, setImportState] = useState<{ type: 'idle' | 'success' | 'error', message?: string }>({ type: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportActive = async () => {
    if (!activeId) return;
    try {
      await exportUniverse(activeId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportAll = async () => {
    try {
      await exportAllUniverses();
    } catch (e) {
      console.error(e);
    }
  };

  const doImport = async (file: File) => {
    try {
      setImportState({ type: 'idle' });
      const universe = await importUniverse(file);
      // Reload all universes from IndexedDB into the store.
      await useUniverseStore.getState().init();
      await setActive(universe.id);
      setImportState({ type: 'success', message: `Imported "${universe.name}" successfully.` });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Import failed.';
      setImportState({ type: 'error', message: msg });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      void doImport(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void doImport(file);
    }
    // reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
            className="panel flex w-[480px] max-w-full flex-col overflow-hidden"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-header">
              <span className="flex items-center gap-1.5 text-sm normal-case tracking-normal text-white">
                <DownloadIcon width={15} height={15} className="text-accent" />
                Import / Export
              </span>
              <button className="btn btn-icon" onClick={() => setOpen(false)}>
                <CloseIcon width={15} height={15} />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-6">
              {/* Export Section */}
              <section className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-white">Export</h3>
                <div className="flex gap-2">
                  <button
                    className="btn flex-1 justify-center py-2 bg-space-800 hover:bg-space-700"
                    onClick={() => void handleExportActive()}
                    disabled={!activeId}
                  >
                    <DownloadIcon width={14} height={14} />
                    Export Active Universe
                  </button>
                  <button
                    className="btn flex-1 justify-center py-2 bg-space-800 hover:bg-space-700"
                    onClick={() => void handleExportAll()}
                  >
                    <PackageIcon width={14} height={14} />
                    Export All Universes
                  </button>
                </div>
                <p className="text-xs text-space-400">
                  Files are compressed and can be shared or backed up
                </p>
              </section>

              <div className="h-px bg-space-700" />

              {/* Import Section */}
              <section className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-white">Import</h3>
                <div
                  className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
                    isDragging
                      ? 'border-accent bg-accent/10'
                      : 'border-space-600 bg-space-850 hover:border-space-500'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                >
                  <UploadIcon width={32} height={32} className="text-space-400 mb-2" />
                  <p className="text-sm text-space-300 mb-4 text-center">
                    Drag and drop a .universe or .universes file here,<br />or click to select
                  </p>
                  <input
                    type="file"
                    accept=".universe,.universes"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                  />
                  <button
                    className="btn btn-primary px-4 py-1.5"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Select File
                  </button>
                </div>

                {importState.type === 'success' && (
                  <div className="text-sm text-emerald-400 bg-emerald-400/10 p-2 rounded">
                    {importState.message}
                  </div>
                )}
                {importState.type === 'error' && (
                  <div className="text-sm text-rose-400 bg-rose-400/10 p-2 rounded">
                    {importState.message}
                  </div>
                )}
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
