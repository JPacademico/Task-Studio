/**
 * The light/dark switch, drawn as a wave that pours down from the header.
 *
 * ## What the reader sees
 *
 * The page in its old palette, frozen, and a wavy front coming down from the
 * top edge. Everything above the front is already in the new palette, and the
 * front leaves the bottom of the screen at the moment the swap is complete. The
 * header is the first thing it crosses, which is also where the switch lives,
 * so the change reads as starting from the control that was pressed.
 *
 * ## Why View Transitions, and what happened to the overlay
 *
 * The first version laid a full-screen `<div>` in the *old background colour*
 * over the page and shrank it away. It read that colour off `<html>`, which is
 * transparent in every skin (they all paint `<body>`), so the overlay was
 * `rgba(0, 0, 0, 0)` and nothing visibly happened at all. With the right colour
 * it would still have been wrong: a flat fill hides every card, word and icon
 * for the length of the animation, so the page would flash blank before the
 * reveal.
 *
 * What a colour change actually needs is a picture of the page as it was.
 * `document.startViewTransition` takes one: it snapshots the old state, runs
 * the update, and draws the old snapshot under a *live* rendering of the new
 * state. The wave is then a `clip-path` on that live layer. Same-document
 * transitions ship in Chromium, Safari 18 and Firefox 144, so every engine this
 * product supports has them. Anything older gets the instant swap, which is
 * what it had before there was any animation.
 *
 * ## Why the crest is a DOM element and not another pseudo-element
 *
 * The front on its own is a hard edge between two flat pictures, which reads
 * as a wipe rather than as a wave. The crest is a soft band of the accent
 * colour riding just behind the front. It is added to the page *inside* the
 * update, so it exists only in the new state and is drawn inside the live
 * layer, clipped by the same front. Its blur is therefore cut sharp on the
 * leading side and fades out behind, which is the shape of a breaking crest,
 * and it is in the new theme's accent because it is part of the new page.
 */

import { flushSync } from 'react-dom';

/** Header to bottom edge. Long enough to be seen, short enough not to wait on. */
const WAVE_MS = 950;

/**
 * Slow off the header, fast through the middle, settling into the bottom edge.
 *
 * The keyframes below are spaced evenly in *progress*, so the easing is applied
 * once to the whole animation, the same way it would be in CSS.
 */
const WAVE_EASING = 'cubic-bezier(0.6, 0.04, 0.3, 1)';

/**
 * Vertices along the front.
 *
 * One every 2.5% of the width. Fewer shows as facets on a wide monitor at the
 * wave's tallest; more only adds to strings the browser has to parse.
 */
const FRONT_POINTS = 40;

/**
 * Keyframes across the whole run.
 *
 * Each one is a complete polygon, and the browser interpolates vertex by vertex
 * between neighbours. The front also drifts sideways as it falls, and a straight
 * line between two distant phases of a sine is visibly not a sine, so the
 * frames have to be close enough together that the drift between any two is
 * small. At 32 it is under a fifth of a radian.
 */
const WAVE_FRAMES = 32;

/** How far the crest's glow reaches back from the front, in CSS pixels. */
const CREST_DEPTH = 26;

/** Clears whatever the front's own swell could reach, so the ends show nothing. */
const EDGE_MARGIN = 6;

interface WaveShape {
  /** Half the peak-to-trough height, in CSS pixels. */
  amplitude: number;
  /** Full wavelengths across the width of the screen. */
  cycles: number;
}

/**
 * The size of the wave, from the size of the screen.
 *
 * Measured once per switch. A fixed pixel wavelength would be a ripple on a
 * wide monitor and a single hump on a phone, so the wavelength is roughly a
 * fixed fraction of a readable column instead, never less than one full wave
 * and never more than three.
 */
const shapeFor = (width: number, height: number): WaveShape => ({
  amplitude: Math.min(42, Math.max(14, height * 0.045)),
  cycles: Math.min(3, Math.max(1.1, width / 560)),
});

/**
 * Where the front is at `x` (0 to 1 across the screen) when the run is
 * `progress` (0 to 1) of the way through.
 *
 * Returned as a percentage of the height plus a pixel offset, and written into
 * the polygon as `calc(% + px)`. That keeps the wave's height in pixels, so it
 * looks the same on every screen, while the distance travelled is in
 * percentages, so it does not depend on measuring the snapshot's box exactly.
 *
 * ## The bounds
 *
 * Two sines with weights summing to one, so the swell never exceeds the
 * amplitude. The offset starts one amplitude and a margin *above* the top edge
 * and ends the same distance *below* the bottom. So the first frame is
 * guaranteed to reveal nothing and the last to reveal everything, whatever the
 * phase happens to be.
 */
const frontAt = (x: number, progress: number, shape: WaveShape) => {
  const reach = shape.amplitude + EDGE_MARGIN;
  // It is always a wave, even at the ends, and tallest in the middle of the run.
  const swell = shape.amplitude * (0.45 + 0.55 * Math.sin(Math.PI * progress));
  // It drifts as it falls, so it rolls rather than being lowered on a rope.
  const drift = progress * Math.PI * 2.2;
  const angle = 2 * Math.PI * shape.cycles * x;
  const wave = 0.68 * Math.sin(angle + drift) + 0.32 * Math.sin(1.9 * angle - 1.4 * drift + 1.1);

  return { percent: progress * 100, pixels: -reach + progress * 2 * reach + swell * wave };
};

const vertex = (x: number, percent: number, pixels: number): string =>
  `${(x * 100).toFixed(2)}% calc(${percent.toFixed(3)}% + ${pixels.toFixed(2)}px)`;

/** Everything above the front: the part of the screen already in the new theme. */
const revealedAt = (progress: number, shape: WaveShape): string => {
  const points = ['0% 0%', '100% 0%'];
  for (let index = FRONT_POINTS; index >= 0; index -= 1) {
    const x = index / FRONT_POINTS;
    const { percent, pixels } = frontAt(x, progress, shape);
    points.push(vertex(x, percent, pixels));
  }
  return `polygon(${points.join(', ')})`;
};

/**
 * A band that follows the front, `CREST_DEPTH` pixels deep, behind it.
 *
 * It runs slightly past the front as well. That part is clipped away by the
 * revealed area anyway, and without it the blur would soften the leading edge
 * as well as the trailing one.
 */
const crestAt = (progress: number, shape: WaveShape): string => {
  const leading: string[] = [];
  const trailing: string[] = [];
  for (let index = 0; index <= FRONT_POINTS; index += 1) {
    const x = index / FRONT_POINTS;
    const { percent, pixels } = frontAt(x, progress, shape);
    leading.push(vertex(x, percent, pixels + 10));
    trailing.unshift(vertex(x, percent, pixels - CREST_DEPTH));
  }
  return `polygon(${[...leading, ...trailing].join(', ')})`;
};

const framesOf = (draw: (progress: number) => string): Keyframe[] =>
  Array.from({ length: WAVE_FRAMES + 1 }, (_, index) => ({
    clipPath: draw(index / WAVE_FRAMES),
  }));

/**
 * Turns every CSS transition off for the length of one style change.
 *
 * Several surfaces fade their colours over 110 to 260ms, which is right for a
 * hover and wrong here: the part of the screen the wave has already crossed
 * would spend its first fifth of a second between palettes, and the edge would
 * look smeared. The reflow commits the new colours as each element's starting
 * point, so when the rule comes off a frame later there is no difference left
 * for a transition to animate.
 */
const withoutTransitions = (change: () => void) => {
  const style = document.createElement('style');
  style.textContent = '*,*::before,*::after{transition:none!important}';
  document.head.appendChild(style);

  change();

  void document.documentElement.offsetHeight;
  window.setTimeout(() => style.remove(), 1);
};

/**
 * The crest, as an element in the page.
 *
 * Two layers because the blur has to apply *after* the clip: a filter and a
 * clip on one element run the other way round, which would blur the band and
 * then cut it back to a hard shape.
 */
const buildCrest = (keyframes: Keyframe[]) => {
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.className = 'theme-wave-crest';

  const band = document.createElement('div');
  band.className = 'theme-wave-crest__band';
  band.style.clipPath = String(keyframes[0].clipPath);
  host.appendChild(band);

  return { host, band };
};

interface WaveOptions {
  /** Flips the palette on the document. Runs exactly once, animated or not. */
  flip: () => void;
  /** Whatever React state follows the palette. Committed inside the update. */
  commit: () => void;
  /** False for changes nobody asked to watch, like adopting a stored profile. */
  animate: boolean;
}

/**
 * How long the update may wait for the browser to take its snapshot.
 *
 * The snapshot is taken at the next rendered frame, which in a visible tab is
 * a few milliseconds away. A page that is not being rendered never gets there,
 * and the palette would wait with it. Past this the wave is abandoned and the
 * palette changes anyway.
 */
const STALL_MS = 400;

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
 * The pointer cannot do it, because a running transition takes the clicks,
 * but the keyboard can. Starting a transition while one is running skips the
 * first to its end state, and its update has already run by then, so the
 * second wave starts from a page that is fully in the first one's palette. The
 * one thing that needs a guard is the first wave's clean-up, which lands a
 * moment *after* the second has put `theme-wave` back on, and must not take
 * it off again. That is what `generation` is for.
 */
export const switchPalette = ({ flip, commit, animate }: WaveOptions) => {
  if (!animate || !canWave()) {
    withoutTransitions(flip);
    commit();
    return;
  }

  const shape = shapeFor(window.innerWidth, window.innerHeight);
  const revealed = framesOf((progress) => revealedAt(progress, shape));
  const crestFrames = framesOf((progress) => crestAt(progress, shape));
  const crest = buildCrest(crestFrames);
  const root = document.documentElement;
  const mine = (generation += 1);

  // `finished` rejects only if the update itself threw; the page still has to
  // be put back either way.
  const cleanUp = () => {
    if (mine === generation) root.classList.remove('theme-wave');
    crest.host.remove();
  };

  // Before the snapshot, so the pseudo-element rules in `index.css` apply from
  // the first frame the transition draws. It changes nothing else.
  root.classList.add('theme-wave');

  /*
   * The update, guarded so it runs once whoever gets there first: the browser
   * once its snapshot is taken, or the stall timer below if it never is.
   */
  let isUpdated = false;
  const update = (withCrest: boolean) => {
    if (isUpdated) return;
    isUpdated = true;

    withoutTransitions(() => {
      flip();
      /*
       * Synchronously, so the new state the browser renders already has every
       * component that reads `isDark` in it. Otherwise React's commit lands a
       * frame into the wave, and whatever it changes (the switch's own knob,
       * for one) visibly jumps inside the part that has already turned.
       */
      flushSync(commit);
    });
    if (withCrest) document.body.appendChild(crest.host);
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
      crest.band.animate(crestFrames, timing);
    })
    /*
     * Rejected when the browser skips the transition, which it does in a
     * hidden tab, and when another switch starts before this one is ready.
     * The update still ran either way, so the palette is right and only the
     * animation is lost.
     */
    .catch(() => undefined);

  transition.finished.then(cleanUp, cleanUp);
};
