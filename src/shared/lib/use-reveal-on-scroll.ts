import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * How long the reveal waits for the observer before giving up on it.
 *
 * Long enough that a working `IntersectionObserver` always wins the race on
 * content below the fold — it fires within a frame of the element being
 * observed — and short enough that a reader who arrives at a broken one never
 * sees an empty section.
 */
const FALLBACK_MS = 700;

/**
 * Whether an element has been scrolled into view — and a promise that it will
 * be treated as visible either way.
 *
 * ## Why this exists instead of Framer Motion's `whileInView`
 *
 * `whileInView` is the right tool for a decoration and the wrong one for
 * *content*, and the difference is what happens when the observer does not
 * fire. That prop pairs an `initial` of `opacity: 0` with a transition that
 * only ever runs from an `IntersectionObserver` callback, so if the callback
 * never arrives, the element stays at zero — permanently, silently, with the
 * markup present and correct and nothing on screen.
 *
 * It is not a hypothetical. The observer does not fire in a heavily throttled
 * background tab, in some embedded and automation contexts, and behind a
 * handful of privacy extensions that stub it out. The failure mode is that a
 * whole section of the page is blank, which is far worse than the animation
 * being missed.
 *
 * So this asks the same question and then answers it anyway. The observer is
 * still the thing that normally decides — the entrance is genuinely
 * scroll-triggered on every browser where scroll-triggering works — and a timer
 * underneath guarantees the content arrives regardless. The animation is an
 * enhancement; being readable is not.
 *
 * ## Why it is one-way
 *
 * Once revealed, always revealed. Content that faded out again on scroll would
 * be a section that flickers on the way back up the page, and there is nothing
 * to be gained by re-playing an entrance somebody has already seen.
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

    // The safety net, armed before the observer so a browser that throws while
    // constructing one is covered too.
    timerRef.current = window.setTimeout(() => setIsRevealed(true), FALLBACK_MS);

    let observer: IntersectionObserver | undefined;

    if (node && typeof IntersectionObserver === 'function') {
      try {
        observer = new IntersectionObserver(
          (entries) => {
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
      observer?.disconnect();
    };
  }, [target, rootMargin, isRevealed]);

  return isRevealed;
};
