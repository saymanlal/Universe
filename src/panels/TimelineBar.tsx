import { useState } from 'react';
import { useUniverseStore } from '@/state/useUniverseStore';
import { simTimeParts, formatCompact, YEAR_SECONDS } from '@/core/format';
import {
  PlayIcon,
  PauseIcon,
  StepBackIcon,
  StepForwardIcon,
  FastForwardIcon,
  RewindIcon,
  ClockIcon,
} from '@/components/icons';

/** Speed presets (simulation seconds advanced per real second). */
const SPEEDS: { v: number; label: string }[] = [
  { v: 1, label: '1×' },
  { v: 60, label: 'min' },
  { v: 3600, label: 'hour' },
  { v: 86400, label: 'day' },
  { v: 604800, label: 'week' },
  { v: YEAR_SECONDS, label: 'year' },
];
const MAX_SPEED = YEAR_SECONDS * 50;

function rateLabel(speed: number): string {
  if (speed >= YEAR_SECONDS) return `${formatCompact(speed / YEAR_SECONDS)} yr/s`;
  if (speed >= 604800) return `${(speed / 604800).toFixed(0)} wk/s`;
  if (speed >= 86400) return `${(speed / 86400).toFixed(0)} d/s`;
  if (speed >= 3600) return `${(speed / 3600).toFixed(0)} h/s`;
  if (speed >= 60) return `${(speed / 60).toFixed(0)} min/s`;
  return `${speed}× real-time`;
}

/**
 * The time engine's control surface: transport (step / play / pause /
 * fast-forward / rewind), speed presets, a live timeline clock, and a
 * jump-to-year control. Because the universe is a pure function of the sim
 * clock, time can run forward, backward, be stepped, or jumped freely.
 */
export function TimelineBar() {
  const time = useUniverseStore((s) => s.time);
  const setTime = useUniverseStore((s) => s.setTime);
  const advanceTime = useUniverseStore((s) => s.advanceTime);
  const setSimTime = useUniverseStore((s) => s.setSimTime);
  const simTime = useUniverseStore((s) => s.active()?.simTime ?? 0);

  const [gotoYear, setGotoYear] = useState('');
  const parts = simTimeParts(simTime);

  const pad = (n: number, w = 2) => String(n).padStart(w, '0');

  const stepBy = (sign: number) => {
    setTime({ paused: true });
    advanceTime(sign * time.speed);
  };

  const jumpToYear = () => {
    const y = Number(gotoYear);
    if (Number.isFinite(y) && gotoYear.trim() !== '') {
      setSimTime(Math.max(0, y) * YEAR_SECONDS);
      setGotoYear('');
    }
  };

  const running = !time.paused;
  const rate = `${time.reverse ? '◀ ' : ''}${rateLabel(time.speed)}`;

  return (
    <div className="flex h-14 shrink-0 items-center gap-3 border-t border-space-700 bg-space-900 px-3">
      {/* transport */}
      <div className="flex items-center gap-1 rounded-lg border border-space-700 bg-space-850 p-1">
        <button className="btn btn-icon" title="Step back one tick" onClick={() => stepBy(-1)}>
          <StepBackIcon width={15} height={15} />
        </button>
        <button
          className={`btn btn-icon ${running && time.reverse ? 'btn-primary' : ''}`}
          title="Rewind (play backward)"
          onClick={() => setTime({ paused: false, reverse: true })}
        >
          <RewindIcon width={15} height={15} />
        </button>
        <button
          className={`btn btn-icon ${running ? '' : 'btn-primary'}`}
          title={running ? 'Pause' : 'Play'}
          onClick={() => setTime({ paused: running })}
        >
          {running ? <PauseIcon width={15} height={15} /> : <PlayIcon width={15} height={15} />}
        </button>
        <button
          className={`btn btn-icon ${running && !time.reverse && time.speed < MAX_SPEED ? 'btn-primary' : ''}`}
          title="Play forward"
          onClick={() => setTime({ paused: false, reverse: false })}
        >
          <PlayIcon width={15} height={15} />
        </button>
        <button
          className={`btn btn-icon ${running && time.speed >= MAX_SPEED ? 'btn-primary' : ''}`}
          title="Fast-forward (maximum speed)"
          onClick={() => setTime({ paused: false, reverse: false, speed: MAX_SPEED })}
        >
          <FastForwardIcon width={15} height={15} />
        </button>
        <button className="btn btn-icon" title="Step forward one tick" onClick={() => stepBy(1)}>
          <StepForwardIcon width={15} height={15} />
        </button>
      </div>

      {/* clock */}
      <div className="flex items-center gap-2">
        <ClockIcon width={16} height={16} className={running ? 'text-accent' : 'text-space-500'} />
        <div>
          <div className="font-mono text-lg leading-none text-white">
            <span className="text-accent-soft">Y{formatCompact(parts.years)}</span>
            <span className="mx-1.5 text-space-600">·</span>
            <span>D{pad(parts.days, 3)}</span>
            <span className="mx-1.5 text-space-600">·</span>
            <span>
              {pad(parts.hours)}:{pad(parts.minutes)}:{pad(parts.seconds)}
            </span>
          </div>
          <div className="mt-0.5 font-mono text-[10px] text-space-500">
            {running ? rate : 'paused'} · {formatCompact(simTime)} s elapsed
          </div>
        </div>
      </div>

      {/* speed presets */}
      <div className="ml-auto flex items-center gap-1 rounded-lg border border-space-700 bg-space-850 p-1">
        {SPEEDS.map((s) => (
          <button
            key={s.v}
            className={`btn px-2 ${time.speed === s.v ? 'btn-primary' : ''}`}
            onClick={() => setTime({ speed: s.v })}
            title={rateLabel(s.v)}
          >
            {s.label}
          </button>
        ))}
        <button
          className={`btn btn-icon ${time.reverse ? 'btn-primary' : ''}`}
          title="Reverse direction"
          onClick={() => setTime({ reverse: !time.reverse })}
        >
          <RewindIcon width={14} height={14} />
        </button>
      </div>

      {/* jump to year */}
      <div className="flex items-center gap-1">
        <input
          value={gotoYear}
          onChange={(e) => setGotoYear(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && jumpToYear()}
          placeholder="year"
          className="w-16 rounded-md border border-space-600 bg-space-800 px-2 py-1 font-mono text-xs text-white outline-none placeholder:text-space-500 focus:border-accent"
        />
        <button className="btn" onClick={jumpToYear} title="Jump to year">
          Go
        </button>
      </div>
    </div>
  );
}
