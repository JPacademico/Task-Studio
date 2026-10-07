import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { useSkin } from '@/app/providers/theme-provider';
import { modalMotion } from './modal-motion';
import { useSurge } from './use-surge';

// --- The ridge round a dialog -------------------------------------------------------------------

/** How many plates stand either side of the middle of a row; a side is `-1` when it has none. */
interface Shape {
  top: number;
  side: number;
}

/** Spacing along a row, in px. Matches `.kaiju-plate--top` and `--left` in `index.css`. */
const TOP_STEP = 58;
const SIDE_STEP = 84;
/** Kept off the rounded corners, where a plate would stand on nothing. */
const CORNER = 22;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Sizes the ridge to the dialog's layout box and returns how many plates fit. Offsets ignore the
 * dialog's own transform, so this is right on the first frame, mid-animation included.
 */
const fit = (panel: HTMLElement, ridge: HTMLElement): Shape => {
  const { offsetLeft: left, offsetTop: top, offsetWidth: width, offsetHeight: height } = panel;
  ridge.style.setProperty('--x', `${left}px`);
  ridge.style.setProperty('--y', `${top}px`);
  ridge.style.setProperty('--w', `${width}px`);
  ridge.style.setProperty('--h', `${height}px`);
  // A dialog near the top of a short window gets shorter plates rather than clipped ones.
  ridge.style.setProperty('--room', `${Math.max(14, top - 6)}px`);

  // A side flush with the screen (a phone's bottom sheet) has nowhere to stand them.
  const hasSides = left > 8 && left + width < window.innerWidth - 8;
  return {
    top: clamp(Math.floor((width / 2 - CORNER) / TOP_STEP), 1, 5),
    side: hasSides ? clamp(Math.floor((height / 2 - CORNER) / SIDE_STEP), 0, 3) : -1,
  };
};

interface Plate {
  key: string;
  edge: 'top' | 'left' | 'right';
  /** Places from the middle of its side. */
  k: number;
  /** Height in px; the width follows from it. */
  size: number;
  /** Where it falls in the surge. */
  order: number;
}

/** Biggest in the middle, smallest at the ends, the way a spine is. */
const swell = (k: number, base: number, rise: number, reach: number) =>
  base * (1 - rise * Math.min(1, (k / reach) ** 2));

const range = (from: number, to: number): number[] => {
  const step = from <= to ? 1 : -1;
  return Array.from({ length: Math.abs(to - from) + 1 }, (_, index) => from + index * step);
};

/** The plates in the order they surge: up the left side, along the top, down the right. */
const layout = ({ top, side }: Shape): Plate[] => {
  const rows: Omit<Plate, 'order'>[] = [];
  const add = (edge: Plate['edge'], ks: number[], base: number, rise: number, reach: number) => {
    for (const k of ks) rows.push({ key: `${edge}${k}`, edge, k, size: swell(k, base, rise, reach) });
  };

  if (side >= 0) add('left', range(side, -side), 30, 0.3, 3.5);
  add('top', range(-top, top), 46, 0.42, 5.5);
  if (side >= 0) add('right', range(-side, side), 30, 0.3, 3.5);
  return rows.map((row, order) => ({ ...row, order }));
};

interface KaijuSpikesProps {
  /** The dialog the ridge stands on. A ref rather than a parent: the panel clips its children. */
  anchor: RefObject<HTMLElement | null>;
}

/**
 * Dorsal plates round the outside of a dialog, on the Kaiju skin only. They arrive and leave with
 * it, and every few seconds surge in turn, tail to head: each one grows and burns.
 */
export const KaijuSpikes = ({ anchor }: KaijuSpikesProps) => {
  const skin = useSkin();
  const reduceMotion = useReducedMotion();
  const ridgeRef = useRef<HTMLDivElement>(null);
  const [shape, setShape] = useState<Shape | null>(null);
  const isKaiju = skin === 'KAIJU';

  useLayoutEffect(() => {
    const panel = anchor.current;
    const ridge = ridgeRef.current;
    if (!isKaiju || !panel || !ridge) return;

    // Only a change in how many plates fit re-renders; moving and sizing the ridge is a style write.
    const update = () => {
      const next = fit(panel, ridge);
      setShape((current) => (current?.top === next.top && current.side === next.side ? current : next));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(panel);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [anchor, isKaiju]);

  useSurge(ridgeRef, isKaiju && !reduceMotion && shape !== null, 500, 6_000, 10_000);

  const plates = useMemo(() => (shape ? layout(shape) : []), [shape]);

  if (!isKaiju) return null;

  return (
    <motion.div ref={ridgeRef} aria-hidden className="kaiju-ridge" {...modalMotion(reduceMotion)}>
      {plates.map((plate) => (
        <span
          key={plate.key}
          className={`kaiju-plate kaiju-plate--${plate.edge}`}
          style={
            {
              '--i': plate.order,
              '--k': plate.k,
              '--size': `${plate.size.toFixed(1)}px`,
            } as CSSProperties
          }
        >
          <i />
        </span>
      ))}
    </motion.div>
  );
};

// --- The breath ---------------------------------------------------------------------------------

/** How often it comes. */
const BREATH_INTERVAL = 30_000;
/** One beam, start to gone. Matches `kaiju-breath-fire` in `index.css`. */
const BREATH_DURATION = 1_600;
/** The first does not wait the full half minute. */
const FIRST_BREATH_DELAY = 6_000;

interface Breath {
  /** Which band of the window it crosses, as a percentage of its height. */
  lane: number;
  /** A beam is never quite level. */
  tilt: number;
  key: number;
}

// Kept off the top and bottom eighths, where the top bar and a bottom sheet live.
const nextBreath = (): Breath => ({
  lane: 18 + Math.random() * 60,
  tilt: -3 + Math.random() * 6,
  key: Date.now(),
});

/** Every thirty seconds on the Kaiju skin, a beam of violet lightning crosses the page, left to right. */
export const KaijuBreath = () => {
  const skin = useSkin();
  const reduceMotion = useReducedMotion();
  const [breath, setBreath] = useState<Breath | null>(null);

  const isBreathing = skin === 'KAIJU' && !reduceMotion;

  useEffect(() => {
    if (!isBreathing) {
      setBreath(null);
      return;
    }

    // Nobody to see a beam in a background tab, and it would queue for when they return.
    const fire = () => {
      if (document.visibilityState === 'visible') setBreath(nextBreath());
    };

    let repeat: ReturnType<typeof setInterval> | undefined;
    const first = setTimeout(() => {
      fire();
      repeat = setInterval(fire, BREATH_INTERVAL);
    }, FIRST_BREATH_DELAY);

    return () => {
      clearTimeout(first);
      clearInterval(repeat);
    };
  }, [isBreathing]);

  useEffect(() => {
    if (!breath) return;
    const timer = setTimeout(() => setBreath(null), BREATH_DURATION);
    return () => clearTimeout(timer);
  }, [breath]);

  if (!isBreathing || !breath) return null;

  return (
    <span
      // Keyed so each beam is a new element and its animation starts over.
      key={breath.key}
      aria-hidden
      className="kaiju-breath"
      style={{ top: `${breath.lane}vh`, '--tilt': `${breath.tilt.toFixed(1)}deg` } as CSSProperties}
    >
      <span className="kaiju-breath__beam" />
      <span className="kaiju-breath__arc" />
    </span>
  );
};

// --- Lettering that sparks ----------------------------------------------------------------------

/** What a glyph is picked from: everything set in Studiozilla. Task titles are not. */
const LETTERING = 'h1, h2, h3:not(.ui-task-title), .ui-section-title, .ui-modal-title, .font-display';

/** The flicker: dim, bright, dim, bright, hold, fade, off — in ms from the start. */
const FLICKER: [('kaiju-glow' | 'kaiju-glow-dim' | null), number][] = [
  ['kaiju-glow-dim', 0],
  ['kaiju-glow', 60],
  ['kaiju-glow-dim', 120],
  ['kaiju-glow', 180],
  ['kaiju-glow-dim', 1000],
  [null, 1140],
];

const isOnScreen = (element: Element): boolean => {
  const rect = element.getBoundingClientRect();
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth
  );
};

/** One visible letter in the skin's face, as a range — or null when there is nothing to light. */
const pickGlyph = (): Range | null => {
  // Titles in random order, measuring only until one is on screen rather than every one each spark.
  const candidates = [...document.querySelectorAll(LETTERING)];
  let element: Element | null = null;
  for (let end = candidates.length - 1; end >= 0 && !element; end--) {
    const pick = Math.floor(Math.random() * (end + 1));
    [candidates[pick], candidates[end]] = [candidates[end], candidates[pick]];
    const candidate = candidates[end];
    if (!candidate.closest('[aria-hidden="true"]') && isOnScreen(candidate)) element = candidate;
  }
  if (!element) return null;

  const letters: [Text, number][] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text;
    for (let index = 0; index < text.data.length; index++) {
      if (/\p{L}|\p{N}/u.test(text.data[index])) letters.push([text, index]);
    }
  }
  if (letters.length === 0) return null;

  const [node, index] = letters[Math.floor(Math.random() * letters.length)];
  const range = document.createRange();
  range.setStart(node, index);
  range.setEnd(node, index + 1);
  return range;
};

/**
 * Now and then one letter of a title catches the charge and glows violet. Painted through the CSS
 * Custom Highlight API, so no text is wrapped, nothing reflows and the glow follows a scroll.
 */
export const KaijuGlowLetters = () => {
  const skin = useSkin();
  const reduceMotion = useReducedMotion();
  const isSupported = typeof CSS !== 'undefined' && 'highlights' in CSS;
  const isSparking = skin === 'KAIJU' && !reduceMotion && isSupported;

  useEffect(() => {
    if (!isSparking) return;

    const registry = CSS.highlights;
    const timers = new Set<number>();
    const clear = () => {
      registry.delete('kaiju-glow');
      registry.delete('kaiju-glow-dim');
    };
    const later = (run: () => void, delay: number) => {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        run();
      }, delay);
      timers.add(timer);
    };

    const spark = () => {
      const range = document.visibilityState === 'visible' ? pickGlyph() : null;
      if (range) {
        for (const [name, at] of FLICKER) {
          later(() => {
            clear();
            if (name) registry.set(name, new Highlight(range));
          }, at);
        }
      }
      later(spark, 2400 + Math.random() * 3600);
    };

    later(spark, 1800);
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
      clear();
    };
  }, [isSparking]);

  return null;
};
