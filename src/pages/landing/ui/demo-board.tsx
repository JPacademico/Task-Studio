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
 * The cards that stay put, so the moving one has something to move *through*.
 *
 * Two in the first column and one in the last: a board with a single card on
 * it does not look like a board, and a board with nine looks like a screenshot
 * nobody can read at this size.
 */
const RESIDENTS: { key: TranslationKey; column: number; colour: string }[] = [
  { key: 'landing.board.cardA', column: 0, colour: '#fca5a5' },
  { key: 'landing.board.cardB', column: 0, colour: '#a5b4fc' },
  { key: 'landing.board.cardC', column: 2, colour: '#86efac' },
];

/**
 * A task being dragged from one column to the next, on a loop.
 *
 * ## Why the card moves between real columns rather than floating
 *
 * Because the claim is *"work goes where you put it"*, and a card drifting
 * over a background demonstrates nothing — it is an animation, not a
 * mechanism. Landing in a named column, under a heading that counts, is the
 * part that reads as software.
 *
 * ## Why the card is lifted, tilted and shadowed while it travels
 *
 * The whole app is built on the idea that these things are paper. A card that
 * slides flatly between two boxes is a div moving; one that lifts off the
 * surface, tips slightly and drops its shadow is a Post-it being carried —
 * which is the same physics the real board uses, and the reason this reads as
 * the product rather than as a diagram of it.
 *
 * ## Why the empty column keeps a card-shaped hole in it
 *
 * The two columns the card travels between each reserve its slot at all times:
 * whichever one is not holding it draws the same card, invisible. Without that,
 * "To do" was three cards tall for two beats and two cards tall for the next
 * two, so the panel — and therefore the whole section under it — grew and shrank
 * by about seventy pixels every 2.8 seconds. On a page somebody is scrolling
 * that is not a wobble, it is the text moving out from under the reader.
 *
 * A fixed pixel height would also have held it still, and would have been a
 * number to get wrong: card text wraps differently in Portuguese, and every one
 * of the app's skins sets its own spacing. Reserving the space with the card
 * *itself* means the measurement is done by the same markup that has to fit in
 * it, in whatever language and skin the reader is looking at.
 *
 * ## Reduced motion
 *
 * `useDemoClock` holds the final step, so the card is simply *in* the last
 * column — the outcome, statically. Nothing lifts, nothing tilts.
 */
export const DemoBoard = () => {
  const t = useT();
  const reduceMotion = useReducedMotion();
  // Four beats rather than three: the extra one is the pause after the card
  // lands, without which the loop restarts the instant it arrives and reads
  // as a stutter rather than as a move.
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
              {/*
                The count is what makes the move mean something. Watching a
                card arrive is decorative; watching a number go up is the
                board doing arithmetic about your work.
              */}
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
                  /*
                   * One element with a shared `layoutId`, so framer-motion
                   * animates it *between* the two containers rather than
                   * unmounting it here and mounting a copy there. That is what
                   * makes it the same card arriving rather than one card
                   * vanishing and another appearing.
                   */
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

              {/*
                The hole the card leaves behind, and the one it is about to fill.

                Same markup, no border, no ink — its only job is to be exactly
                as tall as the card so the column's height never depends on
                where the card currently is. `aria-hidden` because there is
                nothing here to read.
              */}
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
