import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

import { useSkin } from '@/app/providers/theme-provider';

/**
 * Something keeps carving runes on the walls.
 *
 * Every few seconds a rune cuts itself into the page somewhere, holds its
 * light, and weathers away. It is the one piece of this skin that is not a
 * property of a surface — it happens *to* the page, on its own schedule, and
 * that is what stops a stone theme reading as a grey theme.
 *
 * The mechanics are the eldritch watcher's, for the reason recorded there: the
 * fade is a CSS animation the element carries for its whole life, and removal
 * is arithmetic on a timestamp rather than an exit transition. `AnimatePresence`
 * will not unmount a child until its exit animation *completes*, Framer drives
 * that on `requestAnimationFrame`, and rAF stops in a backgrounded tab — so an
 * exit-driven version leaves runes stranded on the page for as long as the user
 * is away.
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
 * How often one appears, and how long it lasts.
 *
 * Five seconds is deliberately shorter than the twenty the eldritch eye waits:
 * that one is a fright and works by being rare, this one is weather and works
 * by being ongoing. The life is a little under the interval, so there is
 * usually exactly one on screen and occasionally two overlapping — which is
 * what keeps it from reading as a metronome.
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

    /*
     * One timer, and it does the sweeping as well as the adding.
     *
     * Expiring old marks on the same tick that adds a new one means there is no
     * second scheduler to leak, and no per-mark timeout to strand. A mark whose
     * life has run out is already invisible — its animation ends at zero
     * opacity and holds there — so the few hundred milliseconds it waits to be
     * removed cost nothing and are never seen.
     */
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
