import { motion } from 'framer-motion';

/** Minimal loading screen shown while the engine hydrates from IndexedDB. */
export function BootScreen() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };
  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };
  return (
    <div className="flex h-full w-full items-center justify-center bg-space-950 relative overflow-hidden">
      {/* Animated starfield background */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white opacity-20"
            style={{
              width: Math.random() * 3 + 1,
              height: Math.random() * 3 + 1,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animation: `float ${Math.random() * 3 + 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`
            }}
          />
        ))}
      </div>
      <motion.div
        className="flex flex-col items-center gap-6 z-10"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={item} className="relative h-20 w-20">
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-accent/20 border-t-accent shadow-glow"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute inset-2 rounded-full border border-nebula-violet/30 border-b-nebula-violet shadow-glow-nebula"
            animate={{ rotate: -360 }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
          />
          <div className="absolute inset-[25%] rounded-full bg-accent/90 shadow-glow animate-pulse-slow" />
        </motion.div>
        
        <motion.div variants={item} className="text-center">
          <h1 className="text-2xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-accent via-nebula-violet to-nebula-pink glow-text uppercase">
            Universe Engine
          </h1>
          <div className="mt-2 text-sm font-medium tracking-wide text-space-400 flex items-center justify-center gap-1">
            Initializing simulation core
            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, times: [0, 0.5, 1] }}
            >
              .
            </motion.span>
            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, delay: 0.2, times: [0, 0.5, 1] }}
            >
              .
            </motion.span>
            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, delay: 0.4, times: [0, 0.5, 1] }}
            >
              .
            </motion.span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
