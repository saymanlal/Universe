import { motion } from 'framer-motion';

/** Minimal loading screen shown while the engine hydrates from IndexedDB. */
export function BootScreen() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-space-950">
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="relative h-14 w-14">
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-accent/30 border-t-accent"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          />
          <div className="absolute inset-[22%] rounded-full bg-accent/80 shadow-glow" />
        </div>
        <div className="text-sm font-medium tracking-wide text-space-400">
          Initializing Universe Engine…
        </div>
      </motion.div>
    </div>
  );
}
