/**
 * The light/dark switch, drawn as a wave that pours out from under the header.
 *
 * ## What the reader sees
 *
 * On the first frame after the press, the header is already in the new
 * palette: it is where the switch lives, so the control answers at once. The
 * rest of the page is still in the old palette, and a wavy front emerges from
 * under the header's bottom border and rolls down to the bottom edge, turning
 * everything it crosses.
 *
 * ## Why View Transitions, and what happened to the overlay
 *
 * The first version laid a full-screen `<div>` in the *old background colour*
 * over the page and shrank it away. It read that colour off `<html>`, which is
 * transparent in every skin (they all paint `<body>`), so the overlay was
 * `rgba(0, 0, 0, 0)` and nothing visibly happened at all. With the right colour
 * it would still have been wrong: a flat fill hides every card, word and icon
 * for the length of the animation.
 *
 * What a colour change needs is a picture of the page as it was.
 * `document.startViewTransition` takes one: it snapshots the old state, runs
 * the update, and draws the old snapshot under a rendering of the new state.
 * The wave is a `clip-path` on that new layer. Same-document transitions ship
 * in Chromium, Safari 18 and Firefox 144. Anything older gets the instant swap.
 *
 * ## Why the header is its own layer
 *
 * Anything marked `data-theme-header` is given a `view-transition-name` for the
 * length of the switch, which lifts it out of the page snapshot into a layer of
 * its own, drawn above the wave. `index.css` hides its old picture and shows its
 * new one with no animation, so it swaps on the first frame. The wave's origin
 * is the bottom border of the widest such element, measured at the press, so
 * it starts under the landing bar, under the studio's top bar when that is
 * revealed, and at the top edge when the bar is hidden or there is none.
 *
 * ## Why nothing in the page moves while it runs
 *
 * The new state is a *live* rendering. Anything that changes in the DOM during
 * the transition makes the browser repaint that whole page picture, every
 * frame, which is what made the first cut stutter on its opening frames. So
 * the update does as little as possible (one class and one style sheet, with
 * React's re-render left to land whenever it lands) and the crest is a static
 * element in a layer of its own, with only its pseudo-element animated.
 */

/** Header border to bottom edge. */
const WAVE_MS = 640;

/**
 * Moving from the first frame, then settling into the bottom edge.
 *
 * The previous curve eased *in*, so the front barely moved for the first
 * tenth of a second, which on top of the frame the snapshot costs read as the
 * switch having frozen. The keyframes are spaced evenly in progress, so this
 * one easing shapes the whole run.
 */
const WAVE_EASING = 'cubic-bezier(0.25, 0.7, 0.3, 1)';

/** Vertices along the front: one every 2.5% of the width. */
const FRONT_POINTS = 40;

/**
 * Keyframes across the run.
 *
 * Each is a complete polygon interpolated vertex by vertex. The front drifts
 * sideways as it falls, and a straight line between two distant phases of a
 * sine is visibly not a sine, so neighbours have to stay close. At 28 the drift
 * between two is under a fifth of a radian.
 */
const WAVE_FRAMES = 28;

/** How far the crest's glow reaches back from the front, in CSS pixels. */
const CREST_DEPTH = 26;

/** Clears whatever the front's own swell could reach, so the ends show nothing. */
const EDGE_MARGIN = 6;

/** How many header layers `index.css` has rules for. */
const MAX_HEADERS = 4;

/**
 * How long the update may wait for the browser to take its snapshot.
 *
 * The snapshot is taken at the next rendered frame, which in a visible tab is
 * a few milliseconds away. A page that is not being rendered never gets there,
 * and the palette would wait with it. Past this the wave is abandoned and the
 * palette changes anyway.
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
 * Where the front is at `x` (0 to 1 across) when the run is `progress` (0 to 1)
 * of the way through, in pixels from the top of the screen.
 *
 * Two sines with weights summing to one, so the swell never exceeds the
 * amplitude. The baseline starts a full amplitude and a margin *above* the
 * header's border and ends the same distance below the bottom edge, and every
 * vertex is held at or below the border. So the first frame reveals nothing,
 * the crests then push out from under the header one after another, and the
 * last frame reveals everything whatever the phase.
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
 * Everything above the front: the part already in the new theme.
 *
 * Including the strip behind the header, from the first frame. A glass header
 * is translucent, and what shows through it should be the new page.
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
    leading.push(vertex(x, y + 4));
    trailing.unshift(vertex(x, Math.max(shape.top, y - CREST_DEPTH)));
  }
  return `polygon(${[...leading, ...trailing].join(', ')})`;
};

const framesOf = (draw: (progress: number) => string): Keyframe[] =>
  Array.from({ length: WAVE_FRAMES + 1 }, (_, index) => ({
    clipPath: draw(index / WAVE_FRAMES),
  }));

/**
 * Turns every CSS transition off, and returns the switch to turn them back on.
 *
 * Several surfaces fade their colours over 110 to 260ms, which is right for a
 * hover and wrong here: the part the wave has crossed would spend its first
 * fifth of a second between palettes. The rule has to be *on* when the new
 * colours are computed. Taking it off again restyles every element, so the
 * wave keeps it until it has finished, where that costs nothing anybody sees.
 */
const suspendTransitions = (): (() => void) => {
  const style = document.createElement('style');
  style.textContent = '*,*::before,*::after{transition:none!important}';
  document.head.appendChild(style);
  return () => style.remove();
};

/** The same, for a swap with no wave: off, change, commit, back on. */
const withoutTransitions = (change: () => void) => {
  const resume = suspendTransitions();
  change();
  void document.documentElement.offsetHeight;
  window.setTimeout(resume, 1);
};

/**
 * The headers that should swap at once, and where the wave starts.
 *
 * Only ones on screen: the studio's top bar hides itself above the viewport
 * until the pointer comes near, and a hidden bar is neither worth a layer nor
 * a place for the wave to start from. Only a bar spanning the screen sets the
 * origin; a floating cluster of controls (the sign-in page's) swaps at once
 * but the wave still starts at the top edge.
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

/**
 * Whether this browser can take the snapshot the wave needs, and whether
 * anybody would see it. A hidden tab (the operating system turning dark while
 * this one is in the background) has nothing to animate for.
 */
const canWave = () =>
  typeof document.startViewTransition === 'function' &&
  document.visibilityState === 'visible' &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Which switch is the latest, so an older one's clean-up leaves it alone. */
let generation = 0;

/**
 * Changes the palette, as a wave where the browser can draw one.
 *
 * ## Switching again mid-wave
 *
 * The pointer cannot, because a running transition takes the clicks, but the
 * keyboard can. Starting a transition while one runs skips the first to its
 * end, and its update has already run, so the second starts from a page fully
 * in the first one's palette. `clearStage` takes the first one's names and
 * crest down before the second is measured (two elements sharing a name would
 * make the browser refuse the transition), and `generation` stops the first
 * one's late clean-up from undoing the second.
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
  const shape: WaveShape = {
    amplitude: Math.min(34, Math.max(12, window.innerHeight * 0.036)),
    cycles: Math.min(3, Math.max(1.1, window.innerWidth / 560)),
    top,
    bottom: window.innerHeight,
  };
  const revealed = framesOf((progress) => revealedAt(progress, shape));
  const crestFrames = framesOf((progress) => crestAt(progress, shape));
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

  /*
   * The update, guarded so it runs once whoever gets there first: the browser
   * once its snapshot is taken, or the stall timer below if it never is.
   *
   * Deliberately small. The class flip is the change; React's state follows
   * on its own schedule, because the new state is live and a commit that lands
   * a frame later simply appears in it. Forcing it synchronously here, as the
   * first cut did, re-rendered every theme consumer before the browser could
   * draw its first frame of the wave.
   */
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
    /*
     * Rejected when the browser skips the transition, which it does when
     * another switch starts before this one is ready. The update still ran,
     * so the palette is right and only the animation is lost.
     */
    .catch(() => undefined);

  // `finished` rejects only if the update itself threw; the page still has to
  // be put back either way.
  transition.finished.then(cleanUp, cleanUp);
};
