import { useEffect, useState, type ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';

import { cn } from '@/shared/lib/cn';

/**
 * The frame every demo loop sits in, and the clock that drives them. A landing page showing "a few
 * seconds of the product working" almost always means an `.mp4`.
 */

/**
 * Steps through `0…steps-1` on a loop, or holds the final step when motion is
 * turned off.
 */
export const useDemoClock = (steps: number, intervalMs = 1_500): number => {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduceMotion) {
      setStep(steps - 1);
      return;
    }

    const timer = window.setInterval(
      () => setStep((current) => (current + 1) % steps),
      intervalMs,
    );
    return () => window.clearInterval(timer);
  }, [intervalMs, reduceMotion, steps]);

  return step;
};

interface DemoFrameProps {
  /** The one-word label on the tab, naming the surface being shown. */
  tab: string;
  title: ReactNode;
  /** Which side the copy sits on. Alternated down the page. */
  side?: 'left' | 'right';
  children: ReactNode;
}

/**
 * One demo: a paper panel with a loop in it, and the sentence it is evidence for. The copy and the
 * panel swap sides down the page.
 */
export const DemoFrame = ({
  tab,
  title,
  side = 'left',
  children,
}: DemoFrameProps) => (
  <div
    className={cn(
      'grid items-center gap-8 lg:grid-cols-2 lg:gap-14',
      side === 'right' && 'lg:[&>*:first-child]:order-2',
    )}
  >
    {/* --- What it is ---
        A single line, and nothing under it. */}
    <div>
      <h3 className="text-balance text-2xl font-semibold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
        {title}
      </h3>
    </div>

    {/* --- The loop ---
        A tabbed panel rather than a browser chrome mock. */}
    <div className="relative">
      <span
        aria-hidden
        className="absolute -top-[26px] left-5 rounded-t-lg border border-b-0 border-edge bg-surface-raised px-3 py-1 text-3xs font-semibold uppercase tracking-[0.14em] text-content-faint"
      >
        {tab}
      </span>

      <div className="panel relative overflow-hidden p-4 sm:p-5">{children}</div>
    </div>
  </div>
);
