import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import { cn } from '@/shared/lib/cn';
import { useT, type TranslationKey } from '@/shared/i18n';

/**
 * The nouns the headline cycles through.
 *
 * Every one is a thing this app actually holds — a task, a meeting, a note, a
 * project — and the last is the word they add up to. That ordering is the
 * argument the headline is making: the specific things first, so "work" lands
 * as a summary of what was just listed rather than as a vague claim on its own.
 *
 * Deliberately five. Three is too few to read as a list and reads as a gimmick;
 * eight means somebody watches the same word come round twice before they have
 * finished the paragraph underneath.
 *
 * ## Why the possessive is not here any more
 *
 * It used to be: a second key per noun, animating in its own column, because
 * English has one "your" for all five and Portuguese has three — *suas*
 * tarefas, *seus* projetos, *seu* trabalho, agreeing with the gender and number
 * of the word behind it.
 *
 * That was correct grammar and a broken headline. Two columns of *different*
 * widths turning over at the same instant is two moving parts where the design
 * has room for one, and on the two Portuguese boundaries where the possessive
 * genuinely changes — `suas` → `seus` → `seu` — the pair visibly reflowed
 * against the verb beside it. No amount of reserved width fixes it, because
 * both columns are reserved at their own widest and the *ratio* between them is
 * what moves.
 *
 * So the determiner went back into the fixed part of the sentence, where each
 * language writes it once and to its own taste: English says "Manage your" and
 * cycles the noun; Portuguese says "Organize" and cycles the noun, which is
 * idiomatic on its own — *Organize tarefas* needs no possessive to mean what it
 * means. One column, one thing moving, and the line is the same length in every
 * language.
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
 * How a word leaves and how the next one arrives.
 *
 * ## Why this is a straight vertical move and nothing else
 *
 * It used to carry a `rotateX` as well, and to run under
 * `AnimatePresence mode="popLayout"`. Both had to go, and the second was the
 * actual defect.
 *
 * `popLayout` takes the *exiting* child out of layout flow by giving it
 * `position: absolute`. Inside a grid cell that is fatal to the arrangement
 * this component is built on: an absolutely-positioned grid item is no longer
 * placed by the cell, so the leaving word snapped to the cell's start and rose
 * *diagonally* rather than straight up — which is precisely the "going upwards
 * to the left" that was reported.
 *
 * Sync mode keeps both words in the same grid cell, in flow, stacked. The cell
 * is already as wide as its widest entry (the invisible measuring layer below),
 * so two words sharing it for 420ms changes no geometry at all. Nothing moves
 * except the type.
 *
 * `rotateX` went with it: without a `perspective` on the parent it was a
 * vertical squash rather than a rotation, and squashing letterforms mid-cycle
 * is the kind of effect that reads as a rendering fault at a glance.
 */
const ENTER = { y: '0.62em', opacity: 0 } as const;
const EXIT = { y: '-0.62em', opacity: 0 } as const;
const REST = { y: 0, opacity: 1 } as const;

/**
 * One word in the headline, replaced on a loop.
 *
 * ## Why the width is reserved rather than animated
 *
 * The words are different lengths, and a headline that reflows every two
 * seconds drags the line under it around with it — which is the single most
 * common way this effect goes wrong. So every word is stacked in the same grid
 * cell, invisible except the current one, and the cell is as wide as the
 * longest of them. Nothing moves except the word itself.
 *
 * That also means the reserved width is correct in *every language* without
 * anybody measuring anything: the widest Portuguese word reserves the
 * Portuguese width, because the same markup is doing the measuring.
 *
 * ## Reduced motion
 *
 * Holds the first word and stops. Not a faster cycle, not a cross-fade — a
 * headline that changes its own words is precisely the kind of unrequested
 * motion the preference exists to turn off, and the sentence reads perfectly
 * with one noun in it.
 */
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
      className={cn(
        'relative inline-grid align-bottom',
        /*
         * Clipped, so a word travelling out of the cell is not briefly readable
         * over the line above. `overflow-hidden` on an inline-grid needs the
         * baseline pinned or the whole headline shifts — `align-bottom` above
         * does that, and the padding gives descenders somewhere to go rather
         * than being sliced off.
         */
        'overflow-hidden pb-[0.12em]',
        className,
      )}
    >
      {/*
        The measuring layer. Every noun rendered at once, invisible and
        un-clickable, all in the one cell — so the cell is as wide as the
        longest of them and the headline never reflows. `aria-hidden` because a
        screen reader must not read the list; the live word below is the
        content.
      */}
      {WORDS.map((word) => (
        <span
          key={word}
          aria-hidden
          className="invisible col-start-1 row-start-1 whitespace-nowrap"
        >
          {t(word)}
        </span>
      ))}

      {/* Sync mode, deliberately — see the note on `ENTER`. Both words share the
          grid cell while one leaves and the other arrives, which is what keeps
          the movement vertical and the geometry still. */}
      <AnimatePresence initial={false}>
        <motion.span
          key={current}
          initial={reduceMotion ? false : ENTER}
          animate={REST}
          exit={reduceMotion ? undefined : EXIT}
          transition={TRANSITION}
          /*
           * `col-start-1 row-start-1` puts it in the same cell as the measuring
           * layer rather than after it, and `whitespace-nowrap` stops a
           * two-word noun breaking mid-rotation.
           */
          className="gpu col-start-1 row-start-1 whitespace-nowrap text-brand"
        >
          {t(current)}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};
