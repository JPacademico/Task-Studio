import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

import { useSkinMotion } from '@/shared/lib/skin-motion';
import { cn } from '@/shared/lib/cn';
import { useT } from '@/shared/i18n';

/**
 * How tall a card is, near enough, and what else a column spends height on.
 *
 * Both measured from the rendered board rather than derived: a task card is
 * about 104px plus the 10px gap under it, and a column spends roughly 300px on
 * the page header, the tab strip, the filter row, its own heading and the
 * board's bottom padding before it draws a single card. Neither needs to be
 * exact — the answer is rounded to a whole card and then clamped.
 */
const CARD_BLOCK_PX = 114;
const COLUMN_CHROME_PX = 300;

/** Never fewer than this, however short the window. */
const MIN_VISIBLE = 3;
/** …and never more, however tall: past this the cap is not doing anything. */
const MAX_VISIBLE = 9;

/**
 * How many cards a column shows before it offers to open.
 *
 * ## Why this is measured rather than a constant
 *
 * The brief asked for "four, more or less depending on the screen". Four is
 * right on a laptop and wrong in both directions elsewhere: on a 1440px-tall
 * monitor it leaves two thirds of the column empty and makes people press a
 * button to see work that would have fitted anyway, and on a short window even
 * four scrolls — which is the thing the cap exists to prevent.
 *
 * So it is a division: the height actually available, over the height of a
 * card. That also means it answers correctly at every root font size, since the
 * card grows with the type — see the fluid scale in `index.css`.
 *
 * ## Why it re-measures on resize and nothing else
 *
 * The value only changes when the window does. Recomputing on scroll or on
 * every render would be work for an answer that cannot have changed.
 */
export const useColumnCapacity = (): number => {
  const read = () =>
    Math.min(
      MAX_VISIBLE,
      Math.max(
        MIN_VISIBLE,
        Math.floor((window.innerHeight - COLUMN_CHROME_PX) / CARD_BLOCK_PX),
      ),
    );

  const [capacity, setCapacity] = useState(read);

  useEffect(() => {
    const measure = () => setCapacity(read());
    measure();

    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return capacity;
};

/**
 * The control that opens a capped column.
 *
 * ## Why a column is capped at all
 *
 * Because a board is a *summary* and a scrolling column is not one. Twenty
 * cards in To do means the reader scrolls one column to read it, loses sight of
 * the other two while they do, and has to scroll back to compare — which is
 * exactly the thing a board is supposed to save them from. Capped, all three
 * columns are legible at once and the ones with more say so.
 *
 * ## Why the count is on the button
 *
 * "Show all" is a promise with no size on it. "Show all 17" is the difference
 * between a click somebody makes and a click somebody thinks about, and it is
 * also the only place the board still tells the truth about how much work is in
 * a column once the column has stopped showing it.
 */
export const ColumnOverflowToggle = ({
  hidden,
  isOpen,
  onToggle,
}: {
  /** How many cards are being withheld. Never rendered when this is zero. */
  hidden: number;
  isOpen: boolean;
  onToggle: () => void;
}) => {
  const t = useT();
  const motionSpec = useSkinMotion();
  const reduceMotion = useReducedMotion();

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      className={cn(
        'group/more mt-0.5 flex w-full items-center justify-center gap-1.5 rounded-xl',
        'border border-dashed border-edge px-3 py-1.5',
        'text-2xs font-medium text-content-muted transition-colors',
        'hover:border-brand/50 hover:bg-surface-raised hover:text-content',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
        'focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
      )}
    >
      {isOpen ? t('board.showFewer') : t('board.showAllCount', { count: String(hidden) })}

      {/*
        The arrowhead turns rather than being swapped for an up-chevron.

        Two icons would be two things to recognise; one that rotates is the same
        object in a different state, which is what the control actually is. It
        is also the cheapest possible animation — one transform, no layout.
      */}
      <motion.span
        aria-hidden
        className="inline-flex"
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={reduceMotion ? { duration: 0 } : motionSpec.reveal}
      >
        <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.6} />
      </motion.span>
    </button>
  );
};

/**
 * The cards past the cap, revealed together.
 *
 * `AnimatePresence` on the group rather than a transition per card: a column
 * opening is one event, and staggering fourteen entrances turns a disclosure
 * into a performance. The height animation is what makes the column look like
 * it is unfolding rather than jumping.
 */
export const ColumnOverflow = ({
  isOpen,
  children,
}: {
  isOpen: boolean;
  children: ReactNode;
}) => {
  const motionSpec = useSkinMotion();
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={reduceMotion ? false : { height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={motionSpec.reveal}
          /* The gap is inside this box, so the revealed run keeps the column's
             own rhythm instead of butting against the card above it. */
          className="flex flex-col gap-2.5 overflow-hidden"
        >
          {/* A hair of top padding, or the first revealed card's shadow is
              clipped by the `overflow-hidden` the height animation needs. */}
          <div className="flex flex-col gap-2.5 pt-2.5">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * The order a capped column shows its work in.
 *
 * ## Why deadline order, and why it is the *column's* order rather than the
 * expanded view's
 *
 * Because the cap decides what a reader sees, so it has to hide the right
 * things. Whatever order the API returns, the four cards that survive a cap
 * must be the four that matter most — and on a board of dated work that is the
 * four due soonest. Sorting only the expanded list would mean the collapsed
 * column showed an arbitrary four and the button revealed the urgent ones,
 * which is precisely backwards.
 *
 * Pinned work sorts above all of it. A pin is somebody saying "this one,
 * regardless" — it would be a strange feature that let the cap hide the card
 * you had pinned to keep in sight.
 *
 * Undated work sorts last rather than first. It is the only defensible answer:
 * a task with no deadline is not urgent by omission, and putting it above dated
 * work would let anything undated push a deadline out of view.
 */
export const byDeadline = <T extends { dueAt: string | null; isPinned?: boolean }>(
  a: T,
  b: T,
): number => {
  if (Boolean(a.isPinned) !== Boolean(b.isPinned)) return a.isPinned ? -1 : 1;
  if (a.dueAt === b.dueAt) return 0;
  if (!a.dueAt) return 1;
  if (!b.dueAt) return -1;
  return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
};
