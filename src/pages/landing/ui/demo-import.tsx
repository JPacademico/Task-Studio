import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, FileText, Github, ListChecks, Users } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { useT, type TranslationKey } from '@/shared/i18n';
import { useDemoClock } from './demo-frame';

/**
 * The stages, and the bar position each one holds.
 *
 * These are the *real* steps — `resolving`, `reading`, `analysing`, `writing` —
 * lifted from the API's `IMPORT_STEPS`, at the real proportions from
 * `IMPORT_PROGRESS`. That is the difference between a demo and a decoration:
 * anybody who signs up and pastes a repository sees this same sequence at
 * these same weights, including the long pause on `analysing` while the
 * assistant reads the repository.
 */
const STAGES: { key: TranslationKey; progress: number }[] = [
  { key: 'landing.import.resolving', progress: 12 },
  { key: 'landing.import.reading', progress: 34 },
  { key: 'landing.import.analysing', progress: 72 },
  { key: 'landing.import.writing', progress: 92 },
];

/** What the finished project shows it produced. */
const RESULTS: { key: TranslationKey; icon: typeof ListChecks }[] = [
  { key: 'landing.import.tasks', icon: ListChecks },
  { key: 'landing.import.pages', icon: FileText },
  { key: 'landing.import.invited', icon: Users },
];

/**
 * A repository becoming a project, on a loop.
 *
 * ## Why the progress bar is the point
 *
 * The feature this is selling is not "we can read GitHub" — plenty of things
 * can. It is that the import *runs in the background*: you paste a URL, close
 * the dialog, and carry on working while a card in the corner tracks it. A
 * still screenshot cannot say that. A bar that visibly steps through named
 * stages and then hands over a finished project is the only honest way to show
 * a thing whose whole selling point is elapsed time.
 *
 * ## Why the stage names are the API's own
 *
 * Because they are checkable. "Analysing…" sitting at 72% for a beat is what
 * actually happens when the assistant reads a repository, and somebody who
 * signs up gets the same four words in the same order. A demo that invented
 * friendlier stage names would be a demo the product then fails to match.
 */
export const DemoImport = () => {
  const t = useT();
  const reduceMotion = useReducedMotion();

  // Four stages plus the finished card, plus one beat to rest on it.
  const step = useDemoClock(STAGES.length + 2, 1_250);
  const isDone = step >= STAGES.length;
  const stage = STAGES[Math.min(step, STAGES.length - 1)];

  return (
    <div className="space-y-3">
      {/* --- What was pasted -------------------------------------------- */}
      <div className="flex items-center gap-2 rounded-lg border border-edge bg-surface-sunken/60 px-2.5 py-2">
        <Github aria-hidden className="h-3.5 w-3.5 shrink-0 text-content-muted" />
        <span className="truncate font-mono text-2xs text-content-muted">
          github.com/acme/billing-service
        </span>
      </div>

      {/* --- The tracker -------------------------------------------------

          Drawn as the app's own import card, down to the round icon tile and
          the two-line label — because that is literally what the reader will
          see in the corner of their screen a minute after signing up. */}
      <div className="rounded-xl border border-edge bg-surface-raised p-3 shadow-sm">
        <div className="flex items-start gap-2.5">
          <span
            aria-hidden
            className={cn(
              'mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-colors',
              isDone ? 'bg-positive/12 text-positive' : 'bg-brand/12 text-brand',
            )}
          >
            {isDone ? <Check className="h-3.5 w-3.5" /> : <Github className="h-3.5 w-3.5" />}
          </span>

          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-2xs font-semibold">acme/billing-service</p>

            {/*
              The stage line is keyed on its own text, so each one animates in
              as a replacement rather than the string mutating in place — which
              at this size reads as a flicker rather than as progress.
            */}
            <div className="mt-0.5 h-[0.875rem] overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={isDone ? 'done' : stage.key}
                  initial={reduceMotion ? false : { y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={reduceMotion ? undefined : { y: -8, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className={cn(
                    'text-3xs',
                    isDone ? 'text-positive' : 'text-content-muted',
                  )}
                >
                  {t(isDone ? 'landing.import.done' : stage.key)}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* The bar. Width rather than a scaled transform: the track is what
            the number *means*, and a bar scaled from its centre reads as a
            shimmer rather than as a proportion. */}
        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-surface-sunken">
          <motion.div
            className={cn('h-full rounded-full', isDone ? 'bg-positive' : 'bg-brand')}
            initial={false}
            animate={{ width: isDone ? '100%' : `${stage.progress}%` }}
            transition={{ type: 'spring', stiffness: 110, damping: 20 }}
          />
        </div>
      </div>

      {/* --- What it produced --------------------------------------------

          Only once it is finished, and it stays for the two beats the clock
          rests on — a summary that flashed past would be a summary nobody
          reads. */}
      <div className="min-h-[3.25rem]">
        <AnimatePresence initial={false}>
          {isDone && (
            <motion.ul
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-3 gap-2"
            >
              {RESULTS.map(({ key, icon: Icon }) => (
                <li
                  key={key}
                  className="rounded-lg border border-edge bg-surface-sunken/50 p-2 text-center"
                >
                  <Icon aria-hidden className="mx-auto h-3.5 w-3.5 text-content-faint" />
                  <p className="mt-1 text-3xs font-medium leading-tight">{t(key)}</p>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
