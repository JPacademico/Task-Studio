import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import { cn } from '@/shared/lib/cn';
import { useT, type TranslationKey } from '@/shared/i18n';

/**
 * The nouns the headline cycles through, each with the possessive that belongs
 * to it.
 *
 * Every noun is a thing this app actually holds — a task, a meeting, a note, a
 * project, a board — and the last is the word they add up to. That ordering is
 * the argument the headline is making: the specific things first, so "work"
 * lands as a summary of what was just listed rather than as a vague claim on
 * its own.
 *
 * Deliberately five. Three is too few to read as a list and reads as a gimmick;
 * eight means somebody watches the same word come round twice before they have
 * finished the paragraph underneath.
 *
 * ## Why the possessive is a second key rather than part of the sentence
 *
 * Because in most languages it is not one word. English has "your" for all
 * five and could have kept it in `landing.hero.titleLead`; Portuguese has
 * three — *suas* tarefas, *seus* projetos, *seu* trabalho — because the
 * possessive agrees with the gender and number of the noun it is attached to.
 * A fixed lead therefore produced "seu tarefas", which is not a sentence in
 * Portuguese, and no amount of picking a different lead word fixes it for all
 * five nouns at once.
 *
 * So the determiner travels *with* the noun. Every locale gets to answer
 * "which possessive goes with this word" for itself, five times, and a
 * language with one answer writes it five times at no cost.
 */
const WORDS: { noun: TranslationKey; determiner: TranslationKey }[] = [
  { noun: 'landing.word.tasks', determiner: 'landing.det.tasks' },
  { noun: 'landing.word.meetings', determiner: 'landing.det.meetings' },
  { noun: 'landing.word.notes', determiner: 'landing.det.notes' },
  { noun: 'landing.word.projects', determiner: 'landing.det.projects' },
  { noun: 'landing.word.work', determiner: 'landing.det.work' },
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
 * placed by `justify-self`, so the leaving word snapped from its right-aligned
 * position to the cell's start and rose *diagonally* rather than straight up —
 * which is precisely the "going upwards to the left" that was reported. In
 * Portuguese it also removed the leaving possessive from the cell's width
 * calculation for a frame, so the gap between "Organize" and the noun jumped on
 * exactly the two turnovers where the word changes width — `suas` → `seu`.
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
 * common way this effect goes wrong. So every word is stacked in the same
 * grid cell, invisible except the current one, and the cell is as wide as the
 * longest of them. Nothing moves except the word itself.
 *
 * That also means the reserved width is correct in *every language* without
 * anybody measuring anything: the widest Portuguese word reserves the
 * Portuguese width, because the same markup is doing the measuring.
 *
 * The possessive gets its own column of the same grid, reserved the same way
 * and right-aligned inside it — so when a short one is showing, the slack
 * falls *before* it, next to the verb, where a slightly wider word space is
 * invisible. Putting the slack after it would push the noun sideways, which is
 * the reflow this whole arrangement exists to prevent.
 *
 * ## Why the possessive is keyed on its own text
 *
 * `AnimatePresence` replaces a child when its `key` changes. Keying the
 * possessive on the *string* rather than on the index means it only animates
 * when it actually differs from the one before: in English, where all five are
 * "your", it never moves at all and reads as part of the fixed sentence. In
 * Portuguese it turns over on the two boundaries where the agreement really
 * changes and holds still across the three where it does not.
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
        'relative inline-grid grid-cols-[auto_auto] gap-x-[0.25em] align-bottom',
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
        The measuring layers. Every possessive and every noun rendered at once,
        invisible and un-clickable, each stacked in its own column — so each
        column is as wide as its own longest entry and the headline never
        reflows. `aria-hidden` because a screen reader must not read the list;
        the live pair below is the content.
      */}
      {WORDS.map(({ determiner }) => (
        <span
          key={determiner}
          aria-hidden
          className="invisible col-start-1 row-start-1 justify-self-end whitespace-nowrap"
        >
          {t(determiner)}
        </span>
      ))}

      {WORDS.map(({ noun }) => (
        <span
          key={noun}
          aria-hidden
          className="invisible col-start-2 row-start-1 whitespace-nowrap"
        >
          {t(noun)}
        </span>
      ))}

      {/* Sync mode, deliberately — see the note on `ENTER`. Both words share the
          grid cell while one leaves and the other arrives, which is what keeps
          the movement vertical and the geometry still. */}
      <AnimatePresence initial={false}>
        <motion.span
          key={t(current.determiner)}
          initial={reduceMotion ? false : ENTER}
          animate={REST}
          exit={reduceMotion ? undefined : EXIT}
          transition={TRANSITION}
          className="gpu col-start-1 row-start-1 justify-self-end whitespace-nowrap"
        >
          {t(current.determiner)}
        </motion.span>
      </AnimatePresence>

      <AnimatePresence initial={false}>
        <motion.span
          key={current.noun}
          initial={reduceMotion ? false : ENTER}
          animate={REST}
          exit={reduceMotion ? undefined : EXIT}
          transition={TRANSITION}
          /*
           * `col-start-2 row-start-1` puts it in the same cell as its own
           * measuring layer rather than after it, and `whitespace-nowrap`
           * stops a two-word noun breaking mid-rotation.
           */
          className="gpu col-start-2 row-start-1 whitespace-nowrap text-brand"
        >
          {t(current.noun)}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};
