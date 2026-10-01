import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

import { useSkin } from '@/app/providers/theme-provider';

/**
 * Something keeps carving runes on the walls. Every few seconds a rune cuts itself into the page
 * somewhere, holds its light, and weathers away.
 */

/** Six staves, each a handful of straight cuts. Nothing here is curved. */
const STAVES: string[] = [
  // ᚠ fehu
  'M7 46V4M7 13 25 5M7 25 25 17',
  // ᚦ thurisaz
  'M7 46V4M7 13 22 20 7 27',
  // ᚱ raido
  'M7 46V4M7 4h11l7 8-7 8H7M18 20l8 26',
  // ᛉ algiz
  'M16 46V7M16 19 4 5M16 19 28 5',
  // ᛏ tiwaz
  'M16 46V4M16 13 6 23M16 13 26 23',
  // ᛒ berkano
  'M8 46V4M8 4l14 7-14 7M8 18l16 9-16 9',
];

/**
 * How often one appears, and how long it lasts. Five seconds is deliberately shorter than the
 * twenty the eldritch eye waits: that one is a fright and works by being rare.
 */
const APPEARANCE_INTERVAL = 5_200;
const APPEARANCE_LIFE = 4_600;

interface Mark {
  key: number;
  bornAt: number;
  /** Percentages of the viewport, kept clear of the very edges. */
  x: number;
  y: number;
  scale: number;
  tilt: number;
  stave: string;
}

const nextMark = (): Mark => ({
  key: Date.now() + Math.random(),
  bornAt: Date.now(),
  x: 6 + Math.random() * 82,
  y: 10 + Math.random() * 74,
  scale: 0.8 + Math.random() * 1.4,
  // A cut made by hand is never quite plumb.
  tilt: Math.random() * 10 - 5,
  stave: STAVES[Math.floor(Math.random() * STAVES.length)],
});

export const RuneScribe = () => {
  const skin = useSkin();
  const reduceMotion = useReducedMotion();
  const [marks, setMarks] = useState<Mark[]>([]);

  const isCarving = skin === 'RUNIC' && !reduceMotion;

  useEffect(() => {
    if (!isCarving) {
      setMarks([]);
      return;
    }

    // One timer, and it does the sweeping as well as the adding. Expiring old marks on the same
    // tick that adds a new one means there is no second scheduler to leak.
    const timer = setInterval(() => {
      const now = Date.now();
      setMarks((current) => [
        ...current.filter((mark) => now - mark.bornAt < APPEARANCE_LIFE),
        nextMark(),
      ]);
    }, APPEARANCE_INTERVAL);

    return () => clearInterval(timer);
  }, [isCarving]);

  if (!isCarving || marks.length === 0) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[15] overflow-hidden">
      {marks.map((mark) => (
        <svg
          // Keyed so a new mark is a new element and starts its own animation
          // rather than inheriting the previous one's progress.
          key={mark.key}
          viewBox="0 0 32 50"
          fill="none"
          className="rune-scribe absolute"
          style={{
            left: `${mark.x}vw`,
            top: `${mark.y}vh`,
            width: `${(1.6 * mark.scale).toFixed(2)}rem`,
            transform: `rotate(${mark.tilt.toFixed(1)}deg)`,
          }}
        >
          {/* The groove, cut first. */}
          <path
            className="rune-scribe__cut"
            pathLength="100"
            d={mark.stave}
            stroke="rgb(var(--rune-stone))"
            strokeWidth="5"
            strokeLinecap="square"
          />
          {/* The light that finds it, a beat behind. */}
          <path
            className="rune-scribe__lit"
            pathLength="100"
            d={mark.stave}
            stroke="rgb(var(--rune-glow))"
            strokeWidth="2.4"
            strokeLinecap="square"
          />
        </svg>
      ))}
    </div>
  );
};

/** How long the arrow burns at least, and at most while the button is held. */
const RUNE_LIT_MIN_MS = 240;
const RUNE_LIT_MAX_MS = 700;

/**
 * The rune pointer's click: the arrow itself lights up. `data-rune-lit` swaps in the burning frames;
 * a still frame swap, so it runs under reduced motion too.
 */
export const RuneClickGlow = () => {
  const skin = useSkin();

  useEffect(() => {
    if (skin !== 'RUNIC') return;

    const root = document.documentElement;
    let litAt = 0;
    let release = 0;
    let ceiling = 0;

    const douse = () => {
      window.clearTimeout(release);
      window.clearTimeout(ceiling);
      delete root.dataset.runeLit;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || event.button !== 0) return;
      if (root.dataset.cursor === 'off') return;

      douse();
      litAt = performance.now();
      root.dataset.runeLit = '';
      // Held past the flash, it goes out anyway: a drag should not carry a burning arrow.
      ceiling = window.setTimeout(douse, RUNE_LIT_MAX_MS);
    };

    const onPointerUp = () => {
      if (!('runeLit' in root.dataset)) return;
      window.clearTimeout(release);
      release = window.setTimeout(douse, Math.max(0, RUNE_LIT_MIN_MS - (performance.now() - litAt)));
    };

    window.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true });
    window.addEventListener('pointerup', onPointerUp, { capture: true, passive: true });
    window.addEventListener('pointercancel', onPointerUp, { capture: true, passive: true });
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, { capture: true });
      window.removeEventListener('pointerup', onPointerUp, { capture: true });
      window.removeEventListener('pointercancel', onPointerUp, { capture: true });
      douse();
    };
  }, [skin]);

  return null;
};
