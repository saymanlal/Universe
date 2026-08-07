import { useEffect } from 'react';
import { useUniverseStore } from '@/state/useUniverseStore';
import { DockLayout } from '@/layout/DockLayout';
import { BootScreen } from '@/components/BootScreen';

/**
 * The primary workspace route. Bootstraps engine state from IndexedDB, then
 * renders the dockable God-Mode workspace.
 */
export function WorkspaceRoute() {
  const loading = useUniverseStore((s) => s.loading);
  const init = useUniverseStore((s) => s.init);

  useEffect(() => {
    void init();
  }, [init]);

  if (loading) return <BootScreen />;
  return <DockLayout />;
}
