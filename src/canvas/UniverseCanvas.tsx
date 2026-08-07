import { useEffect, useRef } from 'react';
import { Renderer } from '@/canvas/Renderer';
import { useUniverseStore } from '@/state/useUniverseStore';
import { EmptyState } from '@/components/EmptyState';

/**
 * Hosts the PixiJS viewport. The renderer owns its own WebGL context and
 * render loop; React only mounts/unmounts it. When no universe exists we show
 * a call-to-action instead of an empty void.
 */
export function UniverseCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const hasUniverse = useUniverseStore((s) => s.activeId !== null);

  useEffect(() => {
    if (!hasUniverse || !hostRef.current) return;
    const renderer = new Renderer();
    rendererRef.current = renderer;
    void renderer.init(hostRef.current);
    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, [hasUniverse]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-space-950">
      {hasUniverse ? (
        <div ref={hostRef} className="absolute inset-0 cursor-grab" />
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
