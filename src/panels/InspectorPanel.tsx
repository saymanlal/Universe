import { useUniverseStore } from '@/state/useUniverseStore';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="field-label">{label}</span>
      <span className="truncate font-mono text-xs text-space-300">{value}</span>
    </div>
  );
}

/**
 * Property inspector for the current selection (falling back to the active
 * universe). Editable fields write straight through to the store, which
 * autosaves to IndexedDB. Entity-specific inspectors (star, planet, person)
 * plug in here in later phases.
 */
export function InspectorPanel() {
  const active = useUniverseStore((s) => s.active());
  const selection = useUniverseStore((s) => s.selection);
  const rename = useUniverseStore((s) => s.renameUniverse);
  const setDescription = useUniverseStore((s) => s.setDescription);

  if (!active) {
    return (
      <div className="flex h-full flex-col">
        <div className="panel-header">
          <span>Inspector</span>
        </div>
        <div className="p-3 text-xs text-space-400">Nothing selected.</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="panel-header">
        <span>Inspector</span>
        <span className="rounded bg-space-700 px-1.5 py-0.5 text-[10px] normal-case tracking-normal text-space-400">
          {selection ? selection.kind : 'universe'}
        </span>
      </div>

      <div className="flex-1 overflow-auto p-3">
        <div className="mb-4">
          <label className="field-label">Name</label>
          <input
            value={active.name}
            onChange={(e) => void rename(active.id, e.target.value)}
            className="mt-1 w-full rounded-md border border-space-600 bg-space-800 px-2 py-1.5 text-sm text-white outline-none focus:border-accent"
          />
        </div>

        <div className="mb-4">
          <label className="field-label">Description</label>
          <textarea
            value={active.description ?? ''}
            onChange={(e) => void setDescription(active.id, e.target.value)}
            rows={3}
            placeholder="Notes about this universe / experiment…"
            className="mt-1 w-full resize-none rounded-md border border-space-600 bg-space-800 px-2 py-1.5 text-sm text-white outline-none placeholder:text-space-500 focus:border-accent"
          />
        </div>

        <div className="rounded-lg border border-space-700 bg-space-800/60 p-2.5">
          <Row label="ID" value={active.id} />
          <Row label="Seed" value={`0x${active.seed.toString(16)}`} />
          <Row label="Timeline" value={`0x${active.timelineSeed.toString(16)}`} />
          <Row label="Sim time" value={`${Math.round(active.simTime)} s`} />
          <Row label="Created" value={new Date(active.createdAt).toLocaleString()} />
          <Row label="Updated" value={new Date(active.updatedAt).toLocaleString()} />
          {selection?.position && (
            <Row
              label="Position"
              value={`${selection.position.x.toFixed(1)}, ${selection.position.y.toFixed(1)}`}
            />
          )}
        </div>
      </div>
    </div>
  );
}
