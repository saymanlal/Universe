import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUiStore } from '@/state/useUiStore';
import { useUniverseStore } from '@/state/useUniverseStore';
import { searchStars } from '@/sim/starfield';
import { spectralType } from '@/sim/star';
import { formatCompact } from '@/core/format';
import type { Star } from '@/sim/star';
import { SearchIcon } from '@/components/icons';

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/**
 * A command-palette-style search over the star field. Because space is
 * infinite, search scans a bounded region around the current camera position
 * (documented to the user). Selecting a result teleports to and selects the
 * star.
 */
export function SearchPanel() {
  const open = useUiStore((s) => s.searchOpen);
  const setOpen = useUiStore((s) => s.setSearchOpen);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      // Focus after the enter animation begins.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const results = useMemo(() => {
    if (!open || query.trim() === '') return [];
    const { active: activeUni, camera } = useUniverseStore.getState();
    const u = activeUni();
    if (!u) return [];
    return searchStars(u.seed, query, camera.x, camera.y).map((r) => r.star);
  }, [open, query]);

  useEffect(() => {
    if (active >= results.length) setActive(0);
  }, [results.length, active]);

  const choose = (star: Star | undefined) => {
    if (!star) return;
    const store = useUniverseStore.getState();
    store.setCamera({ x: star.x, y: star.y, zoom: Math.max(store.camera.zoom, 2.5) });
    store.setSelection({
      kind: 'star',
      id: star.id,
      label: star.name ?? star.designation,
      position: { x: star.x, y: star.y },
    });
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      choose(results[active]);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[12vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            className="panel w-[560px] max-w-full overflow-hidden"
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-space-700 px-3">
              <SearchIcon width={16} height={16} className="text-space-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search stars by name or designation…"
                className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-space-500"
              />
              <span className="kbd">esc</span>
            </div>

            <div className="max-h-[46vh] overflow-auto py-1">
              {query.trim() === '' ? (
                <div className="px-3 py-6 text-center text-xs text-space-500">
                  Type to search the star catalog near your current view.
                </div>
              ) : results.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-space-500">
                  No stars found nearby. Try a different term or pan closer.
                </div>
              ) : (
                results.map((star, i) => (
                  <button
                    key={star.id}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left ${
                      i === active ? 'bg-accent/15' : 'hover:bg-space-700'
                    }`}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(star)}
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ background: hex(star.color), boxShadow: `0 0 8px ${hex(star.color)}` }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-white">
                        {star.name ?? star.designation}
                      </span>
                      <span className="block truncate font-mono text-[11px] text-space-500">
                        {star.name ? `${star.designation} · ` : ''}
                        {spectralType(star)} · {formatCompact(star.x)}, {formatCompact(star.y)}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-space-500">
                      {formatCompact(star.luminosity)} L☉
                    </span>
                  </button>
                ))
              )}
            </div>

            <div className="border-t border-space-700 px-3 py-1.5 text-[10px] text-space-500">
              Searches a bounded region around the current view · <span className="kbd">↑</span>{' '}
              <span className="kbd">↓</span> navigate · <span className="kbd">↵</span> go
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
