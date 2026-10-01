import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import { cn } from '@/shared/lib/cn';
import { useT, type TranslationKey } from '@/shared/i18n';

/**
 * The nouns the headline cycles through. Every one is a thing this app actually holds — a task, a
 * meeting, a note, a project — and the last is the word they add up to.
 */
const WORDS: TranslationKey[] = [
  'landing.word.tasks',
  'landing.word.meetings',
  'landing.word.notes',
  'landing.word.projects',
  'landing.word.work',
];

/** How long each word holds. */
const HOLD_MS = 2_200;

const TRANSITION = { duration: 0.42, ease: [0.22, 1, 0.36, 1] } as const;

/**
 * How a word leaves and how the next one arrives. It used to carry a `rotateX` as well, and to run
 * under `AnimatePresence mode="popLayout"`. Both had to go, and the second was the actual defect.
 */
const ENTER = { y: '0.62em', opacity: 0 } as const;
const EXIT = { y: '-0.62em', opacity: 0 } as const;
const REST = { y: 0, opacity: 1 } as const;

/** One word in the headline, replaced on a loop. */
export const RotatingWord = ({ className }: { className?: string }) => {
  const t = useT();
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;

    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % WORDS.length),
      HOLD_MS,
    );
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  const current = WORDS[index];

  return (
    <span
      /* Opts this whole cell out of a skin that clips a gradient through its headings — Vibecoded
         does, and this is the one thing in a heading that moves. */
      data-no-gradient
      className={cn(
        'relative inline-grid',
        /* The hand, at the headline's own size. The noun is the only word in the headline that
           changes, and it says so by being written in a different hand. */
        'font-hand text-[1em] leading-[0.95]',
        /* Clipped, so a word travelling out of the cell is not briefly readable over the line
           above. */
        'overflow-hidden px-[0.1em] -mx-[0.1em] pb-[0.42em] -mb-[0.26em] pt-[0.34em] -mt-[0.34em]',
        className,
      )}
    >
      {/* The measuring layer. Every noun rendered at once, invisible and un-clickable, all in
          the one cell. */}
      {WORDS.map((word) => (
        <span
          key={word}
          aria-hidden
          className="invisible col-start-1 row-start-1 whitespace-nowrap"
        >
          {t(word)}
        </span>
      ))}

      {/* Sync mode, deliberately — see the note on `ENTER`. Both words share the grid cell
          while one leaves and the other arrives. */}
      <AnimatePresence initial={false}>
        <motion.span
          key={current}
          initial={reduceMotion ? false : ENTER}
          animate={REST}
          exit={reduceMotion ? undefined : EXIT}
          transition={TRANSITION}
          /* `col-start-1 row-start-1` puts it in the same cell as the measuring layer rather than
             after it, and `whitespace-nowrap` stops a two-word noun breaking mid-rotation. */
          className="gpu col-start-1 row-start-1 whitespace-nowrap text-brand"
        >
          {t(current)}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};
