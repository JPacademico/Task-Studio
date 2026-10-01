import { useEffect, useState } from 'react';

import { useT } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';

/** The whole window, for the ring's proportion. Matches `ACCOUNT_DELETION_DELAY_MS` on the API. */
const WINDOW_MS = 24 * 60 * 60 * 1000;

/** Milliseconds left until `dueAt`, re-read every second. Never negative. */
export const useRemaining = (dueAt: string): number => {
  const due = new Date(dueAt).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return Math.max(0, due - now);
};

const split = (ms: number) => {
  const total = Math.floor(ms / 1000);
  return {
    hours: Math.floor(total / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
};

const pad = (value: number) => String(value).padStart(2, '0');

/** One unit of the clock: two digits on a tile, the unit's name under it. */
const Tile = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center gap-1">
    <span
      className={cn(
        'grid h-12 w-12 place-items-center rounded-xl border border-danger/30 bg-danger/10',
        'font-mono text-xl font-semibold tabular-nums text-danger sm:h-14 sm:w-14 sm:text-2xl',
        'shadow-[inset_0_-2px_0_rgb(var(--danger)/0.18)]',
      )}
    >
      {pad(value)}
    </span>
    <span className="text-3xs uppercase tracking-[0.16em] text-content-faint">{label}</span>
  </div>
);

/** The countdown to deletion: a draining ring beside an hours, minutes and seconds clock. */
export const DeletionCountdown = ({ dueAt }: { dueAt: string }) => {
  const t = useT();
  const remaining = useRemaining(dueAt);
  const { hours, minutes, seconds } = split(remaining);
  const fraction = Math.min(1, remaining / WINDOW_MS);

  // The ring: r = 26 in a 64 box, so the circumference is 2πr.
  const circumference = 2 * Math.PI * 26;

  return (
    <div
      role="timer"
      aria-live="off"
      aria-label={t('deletion.timerLabel', { time: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` })}
      className="flex items-center gap-4 sm:gap-5"
    >
      <svg viewBox="0 0 64 64" className="h-16 w-16 shrink-0 -rotate-90" aria-hidden>
        <circle cx="32" cy="32" r="26" fill="none" strokeWidth="5" className="stroke-danger/15" />
        <circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          className="stroke-danger transition-[stroke-dashoffset] duration-1000 ease-linear"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
        />
      </svg>

      <div className="flex items-start gap-1.5 sm:gap-2">
        <Tile value={hours} label={t('deletion.hours')} />
        <span className="mt-2.5 animate-pulse font-mono text-xl font-semibold text-danger/70 sm:mt-3 sm:text-2xl" aria-hidden>
          :
        </span>
        <Tile value={minutes} label={t('deletion.minutes')} />
        <span className="mt-2.5 animate-pulse font-mono text-xl font-semibold text-danger/70 sm:mt-3 sm:text-2xl" aria-hidden>
          :
        </span>
        <Tile value={seconds} label={t('deletion.seconds')} />
      </div>
    </div>
  );
};

/** The same clock on one line, for the banner across the app. */
export const CompactCountdown = ({ dueAt }: { dueAt: string }) => {
  const { hours, minutes, seconds } = split(useRemaining(dueAt));

  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 bg-danger/10 px-2 py-0.5 font-mono text-xs font-semibold tabular-nums text-danger">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-danger" aria-hidden />
      {pad(hours)}:{pad(minutes)}:{pad(seconds)}
    </span>
  );
};
