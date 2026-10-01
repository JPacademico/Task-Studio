/**
 * The light/dark switch, drawn as a wave that pours out from under the header. On the first frame
 * after the press, the header is already in the new palette: it is where the switch lives.
 */

/** Header border to bottom edge. */
const WAVE_MS = 640;

/**
 * Moving from the first frame, then settling into the bottom edge. The previous curve eased *in*,
 * so the front barely moved for the first tenth of a second.
 */
const WAVE_EASING = 'cubic-bezier(0.25, 0.7, 0.3, 1)';

/** Vertices along the front: one every 2.5% of the width. */
const FRONT_POINTS = 40;

/** Keyframes across the run. Each is a complete polygon interpolated vertex by vertex. */
const WAVE_FRAMES = 28;

/**
 * How far the crest's glow reaches back from the front, in CSS pixels. Narrow, because the band is
 * drawn solid (see `.theme-wave-crest`).
 */
const CREST_DEPTH = 10;

/** How far the crest runs ahead of the front, into the old palette. */
const CREST_LEAD = 2;

/** Clears whatever the front's own swell could reach, so the ends show nothing. */
const EDGE_MARGIN = 6;

/** How many header layers `index.css` has rules for. */
const MAX_HEADERS = 4;

/**
 * How long the update may wait for the browser to take its snapshot. The snapshot is taken at the
 * next rendered frame, which in a visible tab is a few milliseconds away.
 */
const STALL_MS = 400;

interface WaveShape {
  /** Half the peak-to-trough height, in CSS pixels. */
  amplitude: number;
  /** Full wavelengths across the width of the screen. */
  cycles: number;
  /** Where the wave starts: the header's bottom border, or 0. */
  top: number;
  /** Where it ends: the bottom of the screen. */
  bottom: number;
}

/**
 * Where the front is at `x` (0 to 1 across) when the run is `progress` (0 to 1) of the way through,
 * in pixels from the top of the screen.
 */
const frontAt = (x: number, progress: number, shape: WaveShape): number => {
  const reach = shape.amplitude + EDGE_MARGIN;
  const start = shape.top - reach;
  const end = shape.bottom + reach;
  // Always a wave, even at the ends, and tallest in the middle of the run.
  const swell = shape.amplitude * (0.45 + 0.55 * Math.sin(Math.PI * progress));
  // It drifts as it falls, so it rolls rather than being lowered on a rope.
  const drift = progress * Math.PI * 2.2;
  const angle = 2 * Math.PI * shape.cycles * x;
  const wave = 0.68 * Math.sin(angle + drift) + 0.32 * Math.sin(1.9 * angle - 1.4 * drift + 1.1);

  return Math.max(shape.top, start + (end - start) * progress + swell * wave);
};

const vertex = (x: number, y: number): string => `${(x * 100).toFixed(2)}% ${y.toFixed(1)}px`;

/**
 * Everything above the front: the part already in the new theme. Including the strip behind the
 * header, from the first frame.
 */
const revealedAt = (progress: number, shape: WaveShape): string => {
  const points = ['0% 0px', '100% 0px'];
  for (let index = FRONT_POINTS; index >= 0; index -= 1) {
    const x = index / FRONT_POINTS;
    points.push(vertex(x, frontAt(x, progress, shape)));
  }
  return `polygon(${points.join(', ')})`;
};

/** A band `CREST_DEPTH` deep riding the front, never above the header. */
const crestAt = (progress: number, shape: WaveShape): string => {
  const leading: string[] = [];
  const trailing: string[] = [];
  for (let index = 0; index <= FRONT_POINTS; index += 1) {
    const x = index / FRONT_POINTS;
    const y = frontAt(x, progress, shape);
    leading.push(vertex(x, y + CREST_LEAD));
    trailing.unshift(vertex(x, Math.max(shape.top, y - CREST_DEPTH)));
  }
  return `polygon(${[...leading, ...trailing].join(', ')})`;
};

const framesOf = (draw: (progress: number) => string): Keyframe[] =>
  Array.from({ length: WAVE_FRAMES + 1 }, (_, index) => ({
    clipPath: draw(index / WAVE_FRAMES),
  }));

/**
 * The last run's keyframes, keyed by the geometry they were drawn for. Somebody flipping back and
 * forth to compare the two palettes asks for the same wave every time: same screen, same header.
 */
let cached: { key: string; revealed: Keyframe[]; crest: Keyframe[] } | null = null;

const keyframesFor = (shape: WaveShape) => {
  const key = `${window.innerWidth}x${shape.bottom}@${shape.top}`;
  if (cached?.key !== key) {
    cached = {
      key,
      revealed: framesOf((progress) => revealedAt(progress, shape)),
      crest: framesOf((progress) => crestAt(progress, shape)),
    };
  }
  return cached;
};

/**
 * Runs `task` once the page has nothing better to do. For clean-up that is not free but has no
 * deadline.
 */
const whenIdle = (task: () => void) => {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(task, { timeout: 500 });
  } else {
    window.setTimeout(task, 120);
  }
};

/**
 * Turns every CSS transition off, and returns the switch to turn them back on. Several surfaces
 * fade their colours over 110 to 260ms, which is right for a hover and wrong here.
 */
const suspendTransitions = (): (() => void) => {
  const style = document.createElement('style');
  style.textContent = '*,*::before,*::after{transition:none!important}';
  document.head.appendChild(style);
  let isResumed = false;
  return () => {
    if (isResumed) return;
    isResumed = true;
    whenIdle(() => style.remove());
  };
};

/** The same, for a swap with no wave: off, change, commit, back on. */
const withoutTransitions = (change: () => void) => {
  const resume = suspendTransitions();
  change();
  void document.documentElement.offsetHeight;
  resume();
};

/**
 * The headers that should swap at once, and where the wave starts. Only ones on screen: the
 * studio's top bar hides itself above the viewport until the pointer comes near.
 */
const measureHeaders = (): { elements: HTMLElement[]; top: number } => {
  const elements: HTMLElement[] = [];
  let top = 0;

  for (const element of document.querySelectorAll<HTMLElement>('[data-theme-header]')) {
    if (elements.length >= MAX_HEADERS) break;
    const rect = element.getBoundingClientRect();
    if (rect.height === 0 || rect.bottom <= 0 || rect.top >= window.innerHeight) continue;

    elements.push(element);
    if (rect.width >= window.innerWidth * 0.9) top = Math.max(top, rect.bottom);
  }

  // A bar that somehow covers most of the screen is not a header to start under.
  return { elements, top: Math.min(Math.round(top), window.innerHeight / 3) };
};

/** The wave's size for the screen and headers as they are right now. */
const currentShape = (top: number): WaveShape => ({
  amplitude: Math.min(34, Math.max(12, window.innerHeight * 0.036)),
  cycles: Math.min(3, Math.max(1.1, window.innerWidth / 560)),
  top,
  bottom: window.innerHeight,
});

/**
 * Builds the keyframes before they are needed. The switch calls this when the pointer arrives on it
 * or it takes focus, which is a good tenth of a second before any press.
 */
export const prepareWave = () => {
  if (!canWave()) return;
  keyframesFor(currentShape(measureHeaders().top));
};

/** Whatever the last switch left named or mounted. Idempotent. */
const clearStage = () => {
  for (const element of document.querySelectorAll<HTMLElement>('[data-theme-header]')) {
    element.style.removeProperty('view-transition-name');
  }
  for (const crest of document.querySelectorAll('.theme-wave-crest')) crest.remove();
};

interface WaveOptions {
  /** Flips the palette on the document. Runs exactly once, animated or not. */
  flip: () => void;
  /** Whatever React state follows the palette. */
  commit: () => void;
  /** False for changes nobody asked to watch, like adopting a stored profile. */
  animate: boolean;
}

/** Whether this browser can take the snapshot the wave needs, and whether anybody would see it. */
const canWave = () =>
  typeof document.startViewTransition === 'function' &&
  document.visibilityState === 'visible' &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Which switch is the latest, so an older one's clean-up leaves it alone. */
let generation = 0;

/**
 * Changes the palette, as a wave where the browser can draw one. The pointer cannot, because a
 * running transition takes the clicks, but the keyboard can.
 */
export const switchPalette = ({ flip, commit, animate }: WaveOptions) => {
  if (!animate || !canWave()) {
    withoutTransitions(flip);
    commit();
    return;
  }

  clearStage();

  const root = document.documentElement;
  const { elements: headers, top } = measureHeaders();
  const { revealed, crest: crestFrames } = keyframesFor(currentShape(top));
  const mine = (generation += 1);

  headers.forEach((element, index) => {
    element.style.setProperty('view-transition-name', `theme-header-${index}`);
  });

  let resumeTransitions: (() => void) | null = null;
  const cleanUp = () => {
    resumeTransitions?.();
    resumeTransitions = null;
    if (mine !== generation) return;
    root.classList.remove('theme-wave');
    clearStage();
  };

  // Before the snapshot, so the pseudo-element rules in `index.css` apply from
  // the first frame the transition draws. It changes nothing else.
  root.classList.add('theme-wave');

  // The update, guarded so it runs once whoever gets there first: the browser once its snapshot is
  // taken, or the stall timer below if it never is. Deliberately small.
  let isUpdated = false;
  const update = (withCrest: boolean) => {
    if (isUpdated) return;
    isUpdated = true;

    resumeTransitions = suspendTransitions();
    flip();
    if (withCrest) {
      const crest = document.createElement('div');
      crest.className = 'theme-wave-crest';
      crest.setAttribute('aria-hidden', 'true');
      document.body.appendChild(crest);
    }
    commit();
  };

  const transition = document.startViewTransition(() => update(true));

  const stall = window.setTimeout(() => {
    if (isUpdated) return;
    transition.skipTransition();
    update(false);
    cleanUp();
  }, STALL_MS);
  const settle = () => window.clearTimeout(stall);
  transition.updateCallbackDone.then(settle, settle);

  transition.ready
    .then(() => {
      const timing: KeyframeAnimationOptions = {
        duration: WAVE_MS,
        easing: WAVE_EASING,
        fill: 'both',
      };
      root.animate(revealed, { ...timing, pseudoElement: '::view-transition-new(root)' });
      root.animate(crestFrames, {
        ...timing,
        pseudoElement: '::view-transition-new(theme-wave-crest)',
      });
    })
    // Rejected when the browser skips the transition, which it does when another switch starts
    // before this one is ready.
    .catch(() => undefined);

  // `finished` rejects only if the update itself threw; the page still has to
  // be put back either way.
  transition.finished.then(cleanUp, cleanUp);
};
