import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';

/**
 * Whether this machine, this moment and this element can afford a live canvas.
 *
 * ## The problem this solves once instead of three times
 *
 * The landing page now has three WebGL surfaces on it — the introduction's 3D
 * field, the closing section's gradient, and the metal wordmark in it. Each is
 * decoration: the page reads correctly, sells correctly and converts correctly
 * with none of them. So each has exactly the same set of reasons not to run,
 * and writing those reasons out three times is how one of them ends up missing
 * the reduced-motion check.
 *
 * A canvas is refused when any of these is true:
 *
 *   - **The reader asked for less motion.** These are continuous animations
 *     with no end state; `prefers-reduced-motion` is not advisory for them.
 *   - **The device is small or weak.** A phone that reports two cores or two
 *     gigabytes is a phone where a shader running at sixty frames per second is
 *     the reason the page scrolls badly. Both hints are advisory and widely
 *     absent, so a missing value counts as capable — refusing on ignorance
 *     would switch the effects off for every Safari user.
 *   - **The connection is metered.** `saveData` is the reader saying, in the
 *     only channel the platform offers, that they are paying per megabyte.
 *     Three.js is not a megabyte anybody should pay for by accident.
 *   - **It is not on screen.** Nothing below the fold should be holding a
 *     WebGL context or a `requestAnimationFrame` loop, and nothing that has
 *     been scrolled away from should still be doing so.
 *
 * ## Why visibility is two-way, unlike the reveal animations
 *
 * `useRevealOnScroll` is deliberately one-way: content that faded out again on
 * scroll would be a page that flickers. This is the opposite case. A canvas is
 * a compositor layer, a GPU context and a frame loop, and there are only so
 * many contexts a browser will hand out before it starts discarding the oldest
 * — so a scene the reader has left has to actually stop, or the page ends up
 * running three of them at once to draw one.
 *
 * ## Why there is no timer fallback
 *
 * Also unlike the reveal. If `IntersectionObserver` is missing or stubbed the
 * honest answer is "do not run the decoration", because the thing being gated
 * is not content and its absence costs the reader nothing. Guessing wrong in
 * the other direction costs them a background tab pinned at 60fps.
 */

/** Below this many logical cores, a continuous shader is not a good trade. */
const MIN_CORES = 4;

/** Below this many gigabytes, likewise. Chromium buckets the value at 0.25/8. */
const MIN_MEMORY_GB = 4;

interface NetworkInformation {
  saveData?: boolean;
}

/**
 * A one-shot verdict on the machine, computed lazily and never changed.
 *
 * Cores and memory do not change during a page's life, and neither does the
 * user's motion preference in any way worth re-reading per element — the media
 * query listener below covers the case where it does. Computing it once and
 * sharing it means three canvases ask the platform three times on the first
 * render and never again.
 */
let capableCache: boolean | null = null;

const isCapableDevice = (): boolean => {
  if (capableCache !== null) return capableCache;
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;

  const cores = navigator.hardwareConcurrency;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;

  capableCache =
    // A missing hint means "unknown", which is treated as capable. Safari
    // reports neither, and Safari machines are not the slow ones.
    (cores === undefined || cores >= MIN_CORES) &&
    (memory === undefined || memory >= MIN_MEMORY_GB) &&
    connection?.saveData !== true &&
    // No WebGL, no canvas — and asking this way rather than by creating a
    // context avoids allocating one just to find out.
    typeof WebGLRenderingContext !== 'undefined';

  return capableCache;
};

export const useCanvasBudget = (
  ref: RefObject<HTMLElement | null>,
  /** Margin around the viewport at which the scene starts, so it is warm on arrival. */
  rootMargin = '200px',
): boolean => {
  const capable = useMemo(isCapableDevice, []);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isOnScreen, setIsOnScreen] = useState(false);

  // Read in an effect rather than lazily: `matchMedia` during render would make
  // the first paint depend on a browser API, and this only ever *removes* a
  // decoration, so one frame of it before the answer arrives is harmless.
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduceMotion(query.matches);

    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  /*
   * A hidden tab stops too.
   *
   * `requestAnimationFrame` is already throttled in a background tab, but a
   * WebGL context is not released by throttling it — and a reader with the page
   * open in a tab they are not looking at is the single most common way one of
   * these ends up running for an hour. `visibilitychange` is the cheapest
   * possible listener and it unmounts the whole scene rather than pausing it.
   *
   * Declared above the observer because the observer now depends on it; see the
   * note there on why waking the tab has to rebuild it.
   */
  const [isTabVisible, setIsTabVisible] = useState(true);

  useEffect(() => {
    const sync = () => setIsTabVisible(document.visibilityState === 'visible');

    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element || !capable || reduceMotion) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      /*
       * The *last* record, not the first — and this is a bug fix, not a tidy-up.
       *
       * An `IntersectionObserver` callback is handed every record queued since
       * it last ran, oldest first. Destructuring `([entry])` reads the oldest
       * and throws the rest away, so whenever two changes coalesce into one
       * delivery the hook settles on the state the element was in *before* the
       * batch rather than the one it is in now.
       *
       * That is not a rare interleaving. Hiding a tab and showing it again is
       * the standard way to produce exactly that pair — the element stops
       * intersecting when the frame stops being rendered and starts again on
       * return — and both records land in the first callback after the tab
       * wakes. Read oldest-first, the answer is `false`.
       *
       * Which is survivable for something that scrolls, because the next scroll
       * queues a fresh record and corrects it. It is *not* survivable for the
       * lava lamp on "New project": that button lives in the sticky header, so
       * it never intersects anything again for the rest of the session, no
       * further record is ever queued, and the lamp stays frozen until the page
       * is reloaded. Which is precisely the reported symptom — come back to an
       * idle tab and the button is dead.
       */
      (entries) => setIsOnScreen(entries[entries.length - 1].isIntersecting),
      { rootMargin },
    );

    observer.observe(element);
    return () => observer.disconnect();
    /*
     * `isTabVisible` is a dependency so that waking the tab tears the observer
     * down and builds a new one, which fires an immediate record describing the
     * element as it is *now*.
     *
     * Belt and braces next to the fix above: that one stops us reading a stale
     * record, this one stops us depending on a record arriving at all. Between
     * them there is no path where a tab that was hidden comes back with the
     * decoration switched off and no event coming to switch it on again. It
     * costs one observer rebuild per tab switch.
     */
  }, [ref, capable, reduceMotion, rootMargin, isTabVisible]);

  return capable && !reduceMotion && isOnScreen && isTabVisible;
};

/**
 * The pixel ratio a decorative canvas should render at.
 *
 * Capped at 2 rather than taking `devicePixelRatio` straight, and the cap is
 * the whole point: a 3× phone or a 4K display asks for nine to sixteen times
 * the fragments of a 1× screen, and a soft gradient behind a headline is the
 * one thing on the page where nobody can tell. The floor of 1 keeps it honest
 * on a display that reports less than one.
 */
export const useCanvasPixelRatio = (max = 2): number => {
  const ratio = useRef(1);

  if (typeof window !== 'undefined') {
    ratio.current = Math.min(max, Math.max(1, window.devicePixelRatio || 1));
  }

  return ratio.current;
};
