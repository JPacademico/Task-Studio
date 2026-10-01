import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';

/**
 * Whether this machine, this moment and this element can afford a live canvas. The landing page now
 * has three WebGL surfaces on it — the introduction's 3D field, the closing section's gradient.
 */

/** Below this many logical cores, a continuous shader is not a good trade. */
const MIN_CORES = 4;

/** Below this many gigabytes, likewise. Chromium buckets the value at 0.25/8. */
const MIN_MEMORY_GB = 4;

interface NetworkInformation {
  saveData?: boolean;
}

/**
 * A one-shot verdict on the machine, computed lazily and never changed. Cores and memory do not
 * change during a page's life.
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

  // Read in an effect rather than lazily: `matchMedia` during render would make the first paint
  // depend on a browser API, and this only ever *removes* a decoration.
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduceMotion(query.matches);

    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  // A hidden tab stops too. `requestAnimationFrame` is already throttled in a background tab.
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
      // The *last* record, not the first — and this is a bug fix, not a tidy-up. An
      // `IntersectionObserver` callback is handed every record queued since it last ran.
      (entries) => setIsOnScreen(entries[entries.length - 1].isIntersecting),
      { rootMargin },
    );

    observer.observe(element);
    return () => observer.disconnect();
    // `isTabVisible` is a dependency so that waking the tab tears the observer down and builds a
    // new one, which fires an immediate record describing the element as it is *now*.
  }, [ref, capable, reduceMotion, rootMargin, isTabVisible]);

  return capable && !reduceMotion && isOnScreen && isTabVisible;
};

/**
 * The pixel ratio a decorative canvas should render at. Capped at 2 rather than taking
 * `devicePixelRatio` straight, and the cap is the whole point.
 */
export const useCanvasPixelRatio = (max = 2): number => {
  const ratio = useRef(1);

  if (typeof window !== 'undefined') {
    ratio.current = Math.min(max, Math.max(1, window.devicePixelRatio || 1));
  }

  return ratio.current;
};
