import { useEffect, useLayoutEffect, useMemo, useState, type CSSProperties, type RefObject } from 'react';
import { useReducedMotion } from 'framer-motion';

import { useSkin } from '@/app/providers/theme-provider';

// --- The ridge round a dialog -------------------------------------------------------------------

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

const sameBox = (a: Box | null, b: Box) =>
  a !== null && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;

/**
 * Where a dialog finally sits. Re-measured when it resizes or the window does: a centred dialog
 * whose content grows moves its top edge, and the plates stand on that edge.
 */
const useSettledBox = (anchor: RefObject<HTMLElement | null>, enabled: boolean): Box | null => {
  const [box, setBox] = useState<Box | null>(null);

  useLayoutEffect(() => {
    const element = anchor.current;
    if (!enabled || !element) return;

    let frame = 0;
    let attempts = 0;
    let previous: Box | null = null;

    const read = (): Box => {
      const rect = element.getBoundingClientRect();
      return {
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    };

    // The dialog animates in; wait for two equal frames (or a third of a second) before trusting it.
    const settle = () => {
      const next = read();
      if (sameBox(previous, next) || ++attempts >= 20) {
        setBox((current) => (sameBox(current, next) ? current : next));
        return;
      }
      previous = next;
      frame = requestAnimationFrame(settle);
    };

    const restart = () => {
      cancelAnimationFrame(frame);
      attempts = 0;
      previous = null;
      frame = requestAnimationFrame(settle);
    };

    restart();
    const observer = new ResizeObserver(restart);
    observer.observe(element);
    window.addEventListener('resize', restart);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', restart);
    };
  }, [anchor, enabled]);

  return enabled ? box : null;
};

interface Plate {
  x: number;
  y: number;
  /** Height in px; the width follows from it. */
  size: number;
  /** Which way it points, in degrees: 0 up, −90 left, 90 right. */
  turn: number;
}

/** Kept off the rounded corners, where a plate would stand on nothing. */
const CORNER = 22;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Biggest mid-run, smallest at the ends, the way a spine is. */
const swell = (t: number, base: number, rise: number) => base * (1 - rise + rise * Math.sin(Math.PI * t));

/**
 * The plates, in the order they light: up the left side, along the top, down the right — tail to
 * head. A side flush with the screen (a phone's bottom sheet) has nowhere to stand them.
 */
const layout = (box: Box): Plate[] => {
  const plates: Plate[] = [];
  const right = box.left + box.width;
  const hasSides = box.left > 8 && right < window.innerWidth - 8;
  const sideCount = clamp(Math.round(box.height / 120), 2, 5);
  const topCount = clamp(Math.round(box.width / 58), 5, 11);
  const sideRun = box.height - 2 * CORNER;
  const topRun = box.width - 2 * CORNER;

  if (hasSides) {
    for (let index = 0; index < sideCount; index++) {
      const t = (index + 0.5) / sideCount;
      plates.push({ x: box.left + 1, y: box.top + box.height - CORNER - t * sideRun, size: swell(t, 30, 0.3), turn: -90 });
    }
  }
  for (let index = 0; index < topCount; index++) {
    const t = (index + 0.5) / topCount;
    // A dialog near the top of a short window gets shorter plates rather than clipped ones.
    const size = Math.min(swell(t, 46, 0.45), Math.max(14, box.top - 6));
    plates.push({ x: box.left + CORNER + t * topRun, y: box.top + 1, size, turn: 0 });
  }
  if (hasSides) {
    for (let index = 0; index < sideCount; index++) {
      const t = (index + 0.5) / sideCount;
      plates.push({ x: right - 1, y: box.top + CORNER + t * sideRun, size: swell(t, 30, 0.3), turn: 90 });
    }
  }
  return plates;
};

interface KaijuSpikesProps {
  /** The dialog the ridge stands on. A ref rather than a parent: the panel clips its children. */
  anchor: RefObject<HTMLElement | null>;
}

/**
 * Dorsal plates round the outside of a dialog, on the Kaiju skin only. They rise and light one
 * after another, half a second apart — the charge before the breath.
 */
export const KaijuSpikes = ({ anchor }: KaijuSpikesProps) => {
  const skin = useSkin();
  const box = useSettledBox(anchor, skin === 'KAIJU');
  const plates = useMemo(() => (box ? layout(box) : []), [box]);

  if (plates.length === 0) return null;

  return (
    <div aria-hidden className="kaiju-ridge inset-0">
      {plates.map((plate, index) => (
        <span
          key={index}
          className="kaiju-plate"
          style={
            {
              left: plate.x,
              top: plate.y,
              '--i': index,
              '--s': `${plate.size.toFixed(1)}px`,
              '--r': `${plate.turn}deg`,
            } as CSSProperties
          }
        >
          <i />
        </span>
      ))}
    </div>
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

/** Every thirty seconds on the Kaiju skin, a beam of atomic blue crosses the page, left to right. */
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
  const candidates = [...document.querySelectorAll(LETTERING)].filter(
    (element) => !element.closest('[aria-hidden="true"]') && isOnScreen(element),
  );
  if (candidates.length === 0) return null;

  const element = candidates[Math.floor(Math.random() * candidates.length)];
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
