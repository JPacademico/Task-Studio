import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * How long the reveal waits to hear from the observer at all before giving up on it. A working
 * `IntersectionObserver` reports every element it is given within a frame of being asked.
 */
const FALLBACK_MS = 700;

/**
 * Whether an element has been scrolled into view — and a promise that it will be treated as visible
 * either way.
 */
export const useRevealOnScroll = (
  target: RefObject<Element | null>,
  /** Shrinks the trigger area, so the entrance starts before the top edge. */
  rootMargin = '-80px',
): boolean => {
  const [isRevealed, setIsRevealed] = useState(false);
  const timerRef = useRef<number>(0);

  useEffect(() => {
    const node = target.current;
    if (isRevealed) return;

    let hasHeard = false;

    // The safety net, armed before the observer so a browser that throws while constructing one is
    // covered too — but only against an observer that has said nothing.
    const arm = () => {
      if (hasHeard || document.visibilityState === 'hidden') return;
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        if (!hasHeard) setIsRevealed(true);
      }, FALLBACK_MS);
    };
    arm();
    document.addEventListener('visibilitychange', arm);

    let observer: IntersectionObserver | undefined;

    if (node && typeof IntersectionObserver === 'function') {
      try {
        observer = new IntersectionObserver(
          (entries) => {
            // Alive and reporting: from here on it decides, not the timer.
            hasHeard = true;
            window.clearTimeout(timerRef.current);
            if (entries.some((entry) => entry.isIntersecting)) setIsRevealed(true);
          },
          { rootMargin },
        );
        observer.observe(node);
      } catch {
        // Left to the timer above, which is already running.
      }
    }

    return () => {
      window.clearTimeout(timerRef.current);
      document.removeEventListener('visibilitychange', arm);
      observer?.disconnect();
    };
  }, [target, rootMargin, isRevealed]);

  return isRevealed;
};
