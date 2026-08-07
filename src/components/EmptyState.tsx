import { motion } from 'framer-motion';
import { useUniverseStore } from '@/state/useUniverseStore';
import { GalaxyIcon, PlusIcon } from '@/components/icons';

/** Shown in the viewport when no universe is active. */
export function EmptyState() {
  const createUniverse = useUniverseStore((s) => s.createUniverse);

  return (
    <div className="grid h-full w-full place-items-center">
      <motion.div
        className="flex max-w-sm flex-col items-center gap-4 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-space-800 text-accent shadow-glow">
          <GalaxyIcon width={32} height={32} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">No universe yet</h2>
          <p className="mt-1 text-sm text-space-400">
            Every universe is generated deterministically from a seed — nothing is stored until
            you change it. Create one to begin observing the cosmos.
          </p>
        </div>
        <button className="btn btn-primary px-4 py-2" onClick={() => void createUniverse()}>
          <PlusIcon width={16} height={16} />
          Create your first universe
        </button>
      </motion.div>
    </div>
  );
}
