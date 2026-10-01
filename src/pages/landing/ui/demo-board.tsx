import { motion, useReducedMotion } from 'framer-motion';

import { cn } from '@/shared/lib/cn';
import { useT, type TranslationKey } from '@/shared/i18n';
import { useDemoClock } from './demo-frame';

/** The three columns the card travels across. */
const COLUMNS = ['landing.board.todo', 'landing.board.doing', 'landing.board.done'] as const;

/**
 * The two of them the card is ever in, and therefore the two that have to hold
 * a card-shaped space open whether it is there or not. See the note below.
 */
const LANES = [0, 1];

/**
 * The cards that stay put, so the moving one has something to move *through*. Two in the first
 * column and one in the last: a board with a single card on it does not look like a board.
 */
const RESIDENTS: { key: TranslationKey; column: number; colour: string }[] = [
  { key: 'landing.board.cardA', column: 0, colour: '#fca5a5' },
  { key: 'landing.board.cardB', column: 0, colour: '#a5b4fc' },
  { key: 'landing.board.cardC', column: 2, colour: '#86efac' },
];

/** A task being dragged from one column to the next, on a loop. */
export const DemoBoard = () => {
  const t = useT();
  const reduceMotion = useReducedMotion();
  // Four beats rather than three: the extra one is the pause after the card lands, without which
  // the loop restarts the instant it arrives and reads as a stutter rather than as a move.
  const step = useDemoClock(4, 1_400);

  // Steps 0 and 1 are "in To do"; 2 and 3 are "landed in Doing".
  const column = step >= 2 ? 1 : 0;
  const isTravelling = step === 1;

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {COLUMNS.map((columnKey, index) => {
        const residents = RESIDENTS.filter((card) => card.column === index);
        const hasMover = column === index;

        return (
          <div key={columnKey} className="space-y-2">
            <div className="flex items-baseline justify-between gap-1 px-0.5">
              <p className="truncate text-3xs font-semibold uppercase tracking-[0.12em] text-content-faint">
                {t(columnKey)}
              </p>
              {/* The count is what makes the move mean something. */}
              <span className="text-3xs tabular-nums text-content-faint">
                {residents.length + (hasMover ? 1 : 0)}
              </span>
            </div>

            <div
              className={cn(
                'min-h-[7.5rem] space-y-2 rounded-xl border border-dashed p-1.5 transition-colors duration-300',
                // The destination lights up while the card is in the air —
                // the same affordance the real board uses for a drop target.
                isTravelling && index === 1
                  ? 'border-brand/60 bg-brand/[0.06]'
                  : 'border-edge bg-surface-sunken/40',
              )}
            >
              {residents.map((card) => (
                <StaticCard key={card.key} label={t(card.key)} colour={card.colour} />
              ))}

              {hasMover && (
                <motion.div
                  /* One element with a shared `layoutId`, so framer-motion animates it *between*
                     the two containers rather than unmounting it here and mounting a copy there. */
                  layoutId="landing-board-card"
                  layout
                  transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                  animate={
                    reduceMotion
                      ? undefined
                      : { rotate: isTravelling ? -4 : 0, scale: isTravelling ? 1.05 : 1 }
                  }
                  className={cn(
                    'gpu rounded-lg border border-edge bg-surface-raised p-2 shadow-sm',
                    isTravelling && 'shadow-lg',
                  )}
                >
                  <MoverCard />
                </motion.div>
              )}

              {/* The hole the card leaves behind, and the one it is about to fill. */}
              {LANES.includes(index) && !hasMover && (
                <div
                  aria-hidden
                  className="invisible rounded-lg border border-edge p-2"
                >
                  <MoverCard />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * What the travelling card says, on its own so the reserved slot can render
 * the identical thing and be the identical height.
 */
const MoverCard = () => {
  const t = useT();

  return (
    <>
      <span
        aria-hidden
        className="mb-1.5 block h-1 w-6 rounded-full"
        style={{ backgroundColor: '#fbbf24' }}
      />
      <p className="text-3xs font-medium leading-tight">{t('landing.board.mover')}</p>
      <p className="mt-1 text-4xs text-content-faint">{t('landing.board.due')}</p>
    </>
  );
};

/** A card that is only there to make the board look like one. */
const StaticCard = ({ label, colour }: { label: string; colour: string }) => (
  <div className="rounded-lg border border-edge bg-surface-raised p-2">
    <span
      aria-hidden
      className="mb-1.5 block h-1 w-6 rounded-full"
      style={{ backgroundColor: colour }}
    />
    <p className="text-3xs font-medium leading-tight text-content-muted">{label}</p>
  </div>
);
