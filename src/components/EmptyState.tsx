import { motion } from 'framer-motion';
import { useUniverseStore } from '@/state/useUniverseStore';
import { GalaxyIcon, PlusIcon, ZapIcon, InfinityIcon, DnaIcon } from '@/components/icons';

/** Shown in the viewport when no universe is active. */
export function EmptyState() {
  const createUniverse = useUniverseStore((s) => s.createUniverse);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };
  const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="grid h-full w-full place-items-center relative">
      <motion.div
        className="flex max-w-lg flex-col items-center gap-6 text-center z-10"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={item} className="relative grid h-24 w-24 place-items-center rounded-3xl bg-space-800/80 glass shadow-glow-lg text-accent">
          <motion.div 
            className="absolute inset-[-10px] rounded-[2rem] border border-accent/20"
            animate={{ rotate: 360, scale: [1, 1.05, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div 
            className="absolute inset-[-20px] rounded-[2.5rem] border border-nebula-violet/10"
            animate={{ rotate: -360, scale: [1, 1.02, 1] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          />
          <GalaxyIcon width={48} height={48} className="animate-pulse-slow" />
        </motion.div>
        
        <motion.div variants={item}>
          <h2 className="text-2xl font-bold text-white tracking-wide">No universe yet</h2>
          <p className="mt-2 text-sm text-space-300 max-w-md mx-auto">
            Every universe is generated deterministically from a seed — nothing is stored until
            you change it. Create one to begin observing the cosmos.
          </p>
        </motion.div>

        <motion.div variants={item} className="flex gap-4 mt-2">
          <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-space-850/50 border border-space-700/50 glass">
            <ZapIcon className="text-accent" width={20} height={20} />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-space-300">Deterministic</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-space-850/50 border border-space-700/50 glass">
            <InfinityIcon className="text-nebula-violet" width={20} height={20} />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-space-300">Infinite</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-space-850/50 border border-space-700/50 glass">
            <DnaIcon className="text-nebula-pink" width={20} height={20} />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-space-300">Evolving</span>
          </div>
        </motion.div>

        <motion.button 
          variants={item}
          className="btn btn-primary px-6 py-3 mt-4 text-sm relative overflow-hidden group shadow-glow" 
          onClick={() => void createUniverse()}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-shimmer" />
          <PlusIcon width={18} height={18} />
          Create your first universe
        </motion.button>
      </motion.div>
    </div>
  );
}
