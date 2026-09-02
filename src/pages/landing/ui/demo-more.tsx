import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  CalendarClock,
  Check,
  FileText,
  GitCommitHorizontal,
  Link2,
  Undo2,
} from 'lucide-react';

import { GoogleCalendarMark, PushPin } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useT, type TranslationKey } from '@/shared/i18n';
import { useDemoClock } from './demo-frame';

/**
 * Six more of the product, built the same way as the first three.
 *
 * Every one of these obeys the rules `DemoFrame` sets out: assembled from the
 * app's own tokens rather than recorded, showing a *mechanism* rather than a
 * claim, and holding its last frame under `prefers-reduced-motion` so a still
 * reader sees the outcome rather than the setup.
 *
 * They live in one file rather than six because they are one thing — the
 * carousel's payload — and six twenty-line modules would be six imports and six
 * places to look for the same idiom.
 */

// ---------------------------------------------------------------------------
// The notes wall
// ---------------------------------------------------------------------------

/** Where each note sits, and the angle it was stuck down at. */
const WALL: { key: TranslationKey; colour: string; x: string; y: string; tilt: number }[] = [
  { key: 'landing.notes.one', colour: '#fde68a', x: '4%', y: '6%', tilt: -4 },
  { key: 'landing.notes.two', colour: '#bfdbfe', x: '52%', y: '2%', tilt: 3 },
  { key: 'landing.notes.three', colour: '#bbf7d0', x: '28%', y: '52%', tilt: -2 },
];

/**
 * Post-its going up on a wall, and a string tied between two of them.
 *
 * The connector is the half worth showing. A sticky note is a sticky note in
 * any application; a note *linked* to another one is the thing the board does
 * that a list cannot, and it is the reason the wall is a canvas rather than a
 * column.
 */
export const DemoNotes = () => {
  const t = useT();
  const reduceMotion = useReducedMotion();
  // Three notes, then the string, then a beat to look at it.
  const step = useDemoClock(WALL.length + 2, 900);

  const pinned = Math.min(step, WALL.length);
  const isLinked = step >= WALL.length + 1;

  return (
    <div className="board-grid relative h-[11.5rem] overflow-hidden rounded-xl border border-edge bg-surface-sunken/40">
      {/* The string, under the paper — drawn first so a note always sits on
          top of it, the way it would on a real wall. */}
      <svg aria-hidden className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <motion.path
          d="M 22 22 C 40 40, 30 55, 44 70"
          fill="none"
          stroke="rgb(var(--brand))"
          strokeWidth="0.6"
          strokeLinecap="round"
          initial={false}
          animate={{ pathLength: isLinked ? 1 : 0, opacity: isLinked ? 0.8 : 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.5 }}
        />
      </svg>

      {WALL.slice(0, pinned).map((note, index) => (
        <motion.div
          key={note.key}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.8, rotate: 0, y: -14 }}
          animate={{ opacity: 1, scale: 1, rotate: note.tilt, y: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 24 }}
          style={{ left: note.x, top: note.y, backgroundColor: note.colour }}
          className="gpu absolute w-[7.5rem] rounded-[3px] p-2 pt-3.5 shadow-postit"
        >
          <span
            aria-hidden
            className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-danger drop-shadow"
          >
            <PushPin isPinned className="h-3.5 w-3.5" />
          </span>
          <p className="font-hand text-3xs leading-snug text-[#1a1a22]">{t(note.key)}</p>
          {/* The link handle, on the two notes the string joins. */}
          {isLinked && index !== 1 && (
            <Link2 aria-hidden className="absolute bottom-1 right-1 h-2.5 w-2.5 text-brand" />
          )}
        </motion.div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Meetings reaching a real calendar
// ---------------------------------------------------------------------------

/**
 * A meeting booked here, arriving there.
 *
 * The claim is narrow and worth being precise about: Task Studio writes into a
 * calendar it creates itself, and this shows exactly that — a row on the left,
 * the same row on the right, under a Google mark. It does not show it reading
 * anybody's existing appointments, because it cannot.
 */
export const DemoMeetings = () => {
  const t = useT();
  const reduceMotion = useReducedMotion();
  const step = useDemoClock(4, 1_200);

  const isBooked = step >= 1;
  const isSynced = step >= 2;

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      {/* --- Booked here ------------------------------------------------- */}
      <div className="space-y-2 rounded-xl border border-edge bg-surface-sunken/40 p-2.5">
        <p className="text-3xs font-semibold uppercase tracking-[0.12em] text-content-faint">
          {t('landing.meet.here')}
        </p>

        <AnimatePresence initial={false}>
          {isBooked && (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-brand/40 bg-brand/[0.06] p-2"
            >
              <p className="truncate text-2xs font-semibold">{t('landing.meet.title')}</p>
              <p className="mt-0.5 flex items-center gap-1 text-3xs text-content-muted">
                <CalendarClock aria-hidden className="h-2.5 w-2.5" />
                {t('landing.meet.when')}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="h-8 rounded-lg border border-dashed border-edge/70" />
      </div>

      {/* The direction of travel, which is the whole feature. */}
      <motion.span
        aria-hidden
        className="text-content-faint"
        animate={reduceMotion ? undefined : { x: isSynced ? [0, 4, 0] : 0 }}
        transition={{ duration: 0.6 }}
      >
        <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
      </motion.span>

      {/* --- Landed there ------------------------------------------------ */}
      <div className="space-y-2 rounded-xl border border-edge bg-surface-sunken/40 p-2.5">
        <p className="flex items-center gap-1.5 text-3xs font-semibold uppercase tracking-[0.12em] text-content-faint">
          <GoogleCalendarMark className="h-3 w-3" />
          {t('landing.meet.there')}
        </p>

        <AnimatePresence initial={false}>
          {isSynced && (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="rounded-lg border border-positive/40 bg-positive/[0.07] p-2"
            >
              <p className="truncate text-2xs font-semibold">{t('landing.meet.title')}</p>
              <p className="mt-0.5 flex items-center gap-1 text-3xs text-positive">
                <Check aria-hidden className="h-2.5 w-2.5" strokeWidth={3} />
                {t('landing.meet.onPhone')}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="h-8 rounded-lg border border-dashed border-edge/70" />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Pages that live with the project
// ---------------------------------------------------------------------------

const PAGE_LINES = [92, 78, 96, 61, 85, 40];

/**
 * A page being written next to the work it is about.
 *
 * Drawn as ruled lines filling in rather than as lorem text: the feature is
 * that documents live *in the project*, and inventing a paragraph for the
 * reader to squint at would put the emphasis on words nobody is meant to read.
 */
export const DemoPages = () => {
  const t = useT();
  const reduceMotion = useReducedMotion();
  const step = useDemoClock(PAGE_LINES.length + 2, 420);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 border-b border-edge pb-2">
        <FileText aria-hidden className="h-3.5 w-3.5 shrink-0 text-brand" />
        <p className="truncate text-2xs font-semibold">{t('landing.pages.title')}</p>
        <span className="ml-auto shrink-0 rounded-full border border-edge px-1.5 py-px text-4xs uppercase tracking-wide text-content-faint">
          {t('landing.pages.saved')}
        </span>
      </div>

      <div className="space-y-1.5 rounded-xl border border-edge bg-surface-raised p-3">
        {PAGE_LINES.map((width, index) => (
          <motion.div
            key={width}
            className="h-1.5 rounded-full bg-content-faint/25"
            initial={false}
            animate={{
              width: index < step ? `${width}%` : '0%',
              opacity: index < step ? 1 : 0,
            }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' }}
          />
        ))}

        {/* The caret, so the block reads as being typed rather than loaded. */}
        <motion.span
          aria-hidden
          className="block h-2.5 w-px bg-brand"
          animate={reduceMotion ? undefined : { opacity: [1, 0, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      </div>

      <p className="text-3xs text-content-faint">{t('landing.pages.hint')}</p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// A changelog you can undo
// ---------------------------------------------------------------------------

/**
 * Somebody deleting something, and the log putting it back.
 *
 * ## Why the undo is the demo and the log is not
 *
 * Every project tool has an activity feed. Almost none of them let you *press*
 * one — and being able to is the entire reason this product's log exists. So
 * the loop spends its time on the reversal rather than on the list: a row is
 * struck through, a button is pressed, the row comes back.
 */
export const DemoUndo = () => {
  const t = useT();
  const reduceMotion = useReducedMotion();
  const step = useDemoClock(5, 1_150);

  const isDeleted = step >= 1 && step < 3;
  const isRestored = step >= 3;

  return (
    <div className="space-y-2">
      {/* --- The board it happens to ------------------------------------- */}
      <div className="rounded-xl border border-edge bg-surface-raised p-2.5">
        <motion.div
          animate={{ opacity: isDeleted ? 0.35 : 1 }}
          transition={{ duration: 0.25 }}
          className="flex items-center gap-2 rounded-lg border border-edge bg-surface-sunken/50 p-2"
        >
          <span
            aria-hidden
            className="h-6 w-1 shrink-0 rounded-full"
            style={{ backgroundColor: 'rgb(var(--brand))' }}
          />
          <p
            className={cn(
              'truncate text-2xs font-medium transition-all',
              isDeleted && 'line-through decoration-danger',
            )}
          >
            {t('landing.undo.task')}
          </p>
        </motion.div>
      </div>

      {/* --- The line the log wrote about it ----------------------------- */}
      <div className="space-y-1.5 rounded-xl border border-edge bg-surface-sunken/40 p-2.5">
        <p className="text-3xs font-semibold uppercase tracking-[0.12em] text-content-faint">
          {t('landing.undo.log')}
        </p>

        <AnimatePresence initial={false}>
          {step >= 1 && (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 rounded-lg bg-surface-raised px-2 py-1.5"
            >
              <span className="truncate text-3xs text-content-muted">
                {t(isRestored ? 'landing.undo.restored' : 'landing.undo.deleted')}
              </span>

              {/* The control, pressed on beat three. `animate` on scale rather
                  than a hover state: nobody is hovering a landing page. */}
              <motion.span
                className={cn(
                  'ml-auto inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-4xs font-medium',
                  isRestored
                    ? 'border-positive/50 text-positive'
                    : 'border-edge text-content-muted',
                )}
                animate={reduceMotion ? undefined : { scale: step === 3 ? [1, 0.9, 1] : 1 }}
                transition={{ duration: 0.3 }}
              >
                {isRestored ? (
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                ) : (
                  <Undo2 className="h-2.5 w-2.5" />
                )}
                {t(isRestored ? 'landing.undo.done' : 'landing.undo.button')}
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="h-5 rounded-md bg-surface-raised/60" />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// A commit that closes its own task
// ---------------------------------------------------------------------------

/**
 * The terminal half of the product, in four beats.
 *
 * Shown as a real prompt because that is what it is. The one thing this must
 * not do is imply the server commits anything: the line typed is `git commit`,
 * on the reader's machine, and Task Studio's part is the sentence underneath.
 */
export const DemoCommit = () => {
  const t = useT();
  const reduceMotion = useReducedMotion();
  const step = useDemoClock(5, 1_150);

  return (
    <div className="space-y-2 rounded-xl border border-edge bg-surface-sunken/60 p-3 font-mono">
      <p className="flex items-center gap-1.5 text-2xs">
        <span className="text-positive">$</span>
        <span className="text-content">git commit -m &quot;fix: rate limit the import routes&quot;</span>
      </p>

      <AnimatePresence initial={false}>
        {step >= 1 && (
          <motion.p
            key="hook"
            initial={reduceMotion ? false : { opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-1.5 text-3xs text-content-faint"
          >
            <GitCommitHorizontal aria-hidden className="h-3 w-3 shrink-0" />
            {t('landing.commit.checking')}
          </motion.p>
        )}

        {step >= 2 && (
          <motion.div
            key="matched"
            initial={reduceMotion ? false : { opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-lg border border-edge bg-surface-raised p-2 font-sans"
          >
            <p className="truncate text-2xs font-semibold">{t('landing.commit.task')}</p>
            <p className="mt-0.5 text-3xs text-content-muted">{t('landing.commit.branch')}</p>
          </motion.div>
        )}

        {step >= 3 && (
          <motion.p
            key="done"
            initial={reduceMotion ? false : { opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-1.5 text-3xs font-semibold text-positive"
          >
            <Check aria-hidden className="h-3 w-3 shrink-0" strokeWidth={3} />
            {t('landing.commit.closed')}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

// ---------------------------------------------------------------------------
// The whiteboard
// ---------------------------------------------------------------------------

/**
 * Ink appearing on a board, at a nib you can see.
 *
 * The dotted ring is not decoration here — it is the actual cursor the board
 * draws, so this is the interface rather than a picture of it.
 */
export const DemoWhiteboard = () => {
  const t = useT();
  const reduceMotion = useReducedMotion();
  const step = useDemoClock(4, 1_000);

  return (
    <div className="board-grid relative h-[11.5rem] overflow-hidden rounded-xl border border-edge bg-surface-raised">
      <svg aria-hidden className="absolute inset-0 h-full w-full" viewBox="0 0 100 60">
        <motion.path
          d="M 12 44 C 24 12, 40 50, 52 24 S 78 16, 88 34"
          fill="none"
          stroke="rgb(var(--brand))"
          strokeWidth="2.2"
          strokeLinecap="round"
          initial={false}
          animate={{ pathLength: step >= 1 ? 1 : 0 }}
          transition={{ duration: reduceMotion ? 0 : 1.1, ease: 'easeInOut' }}
        />
        <motion.path
          d="M 20 52 L 80 52"
          fill="none"
          stroke="rgb(var(--content) / 0.45)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeDasharray="3 3"
          initial={false}
          animate={{ pathLength: step >= 2 ? 1 : 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.6 }}
        />
      </svg>

      {/* The nib, parked where the stroke ends. */}
      <motion.span
        aria-hidden
        className="absolute rounded-full border border-dashed border-content/60"
        style={{ width: 18, height: 18 }}
        initial={false}
        animate={{
          left: step >= 1 ? '86%' : '10%',
          top: step >= 1 ? '52%' : '70%',
          opacity: step >= 3 ? 0 : 1,
        }}
        transition={{ duration: reduceMotion ? 0 : 1.1, ease: 'easeInOut' }}
      />

      <p className="absolute bottom-2 left-3 text-3xs text-content-faint">
        {t('landing.draw.hint')}
      </p>
    </div>
  );
};
