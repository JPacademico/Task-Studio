import { useRef, type ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';

import { cn } from '@/shared/lib/cn';
import { useRevealOnScroll } from '@/shared/lib/use-reveal-on-scroll';

/**
 * A section arriving as the reader reaches it. Framer has a prop for exactly this and it is the
 * wrong tool for a *section*.
 */
export const Reveal = ({
  children,
  className,
  /** Staggers siblings inside one section. Milliseconds. */
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) => {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const isRevealed = useRevealOnScroll(ref);

  // Nothing to reveal *from* when motion is off. Not a faster fade — no starting state at all, so
  // the section is simply there.
  const isVisible = reduceMotion || isRevealed;

  return (
    <div
      ref={ref}
      className={cn(
        'motion-safe:transition-[opacity,transform] motion-safe:duration-700',
        'motion-safe:[transition-timing-function:cubic-bezier(0.16,1,0.3,1)]',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0 will-change-transform',
        className,
      )}
      // Applied unconditionally: the delay is what staggers the reveal, so it
      // has to be on the element before the class flips, not after.
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
};
