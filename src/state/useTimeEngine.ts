import { useEffect } from 'react';
import { useUniverseStore } from '@/state/useUniverseStore';
import { YEAR_SECONDS } from '@/core/format';

/**
 * Drives the simulation clock. While playing, it advances the active
 * universe's `simTime` by `speed` sim-seconds per real second using a
 * requestAnimationFrame loop.
 */
export function useTimeEngine() {
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let accum = 0;
    let flushAccum = 0;

    const loop = (now: number) => {
      const { time, activeId, advanceTime } = useUniverseStore.getState();
      
      // Use higher clamp dt for super fast forward to ensure non-stopping fast simulation
      const maxDt = time.speed > YEAR_SECONDS * 1000 ? 0.5 : 0.25;
      const dtReal = Math.min(maxDt, (now - last) / 1000);
      last = now;

      if (!time.paused && activeId) {
        const signed = time.reverse ? -time.speed : time.speed;
        accum += dtReal * signed;
        flushAccum += dtReal;

        // Flush faster at high speeds for smooth UI updates
        const flushThreshold = time.speed > YEAR_SECONDS * 100 ? 0.016 : 0.1;
        if (flushAccum >= flushThreshold) {
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
