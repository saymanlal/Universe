import { useEffect } from 'react';
import { useUniverseStore } from '@/state/useUniverseStore';

/**
 * Drives the simulation clock. While playing, it advances the active
 * universe's `simTime` by `speed` sim-seconds per real second using a
 * requestAnimationFrame loop, flushing to the store at ~10 Hz so the UI stays
 * cheap. This is the Phase 1 foundation of the Phase 8 time engine.
 */
export function useTimeEngine() {
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let accum = 0;
    let flushAccum = 0;

    const loop = (now: number) => {
      const dtReal = Math.min(0.25, (now - last) / 1000); // clamp long frames/tab-switches
      last = now;

      const { time, activeId, advanceTime } = useUniverseStore.getState();
      if (!time.paused && activeId) {
        accum += dtReal * time.speed;
        flushAccum += dtReal;
        // Flush roughly 10× per second to avoid 60 Hz store churn.
        if (flushAccum >= 0.1) {
          advanceTime(accum);
          accum = 0;
          flushAccum = 0;
        }
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
}
