import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

import { useSkinMotion } from '@/shared/lib/skin-motion';
import { cn } from '@/shared/lib/cn';
import { useT } from '@/shared/i18n';

/**
 * How tall a card is, near enough, and what else a column spends height on. Both measured from the
 * rendered board rather than derived.
 */
const CARD_BLOCK_PX = 114;
const COLUMN_CHROME_PX = 300;

/** Never fewer than this, however short the window. */
const MIN_VISIBLE = 3;
/** …and never more, however tall: past this the cap is not doing anything. */
const MAX_VISIBLE = 9;

/**
 * How many cards a column shows before it offers to open. The brief asked for "four, more or less
 * depending on the screen".
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

/** The control that opens a capped column. */
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

      {/* The arrowhead turns rather than being swapped for an up-chevron. Two icons would be
          two things to recognise; one that rotates is the same object in a different state. */}
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
 * The cards past the cap, revealed together. `AnimatePresence` on the group rather than a
 * transition per card: a column opening is one event.
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

/** The order a capped column shows its work in. expanded view's. */
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
