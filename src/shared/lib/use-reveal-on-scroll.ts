import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * How long the reveal waits to hear from the observer at all before giving up
 * on it.
 *
 * A working `IntersectionObserver` reports every element it is given within a
 * frame of being asked — `isIntersecting: false` for one below the fold — so
 * silence for this long means the observer is not going to report anything.
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
 * ## Why the timer only covers a *silent* observer
 *
 * It used to reveal the element 700ms after mount whatever the observer said.
 * That was the safety net firing on every page load: every section of the
 * landing page, including the ones three screens down, had quietly revealed
 * itself before anybody scrolled, so the entrance played to nobody and the
 * page read as having no scroll animation at all. The first callback from the
 * observer — which arrives almost at once, in or out of view — now disarms the
 * timer, and from then on only actual intersection reveals.
 *
 * A tab opened in the background is the other case worth handling: nothing is
 * being scrolled, timers still run, and the observer may not report until the
 * tab is shown. The timer is only armed once the document is visible, so a
 * page opened with a middle click still animates when its reader gets to it.
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

    let hasHeard = false;

    // The safety net, armed before the observer so a browser that throws while
    // constructing one is covered too — but only against an observer that has
    // said nothing, and only while somebody can see the page.
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
