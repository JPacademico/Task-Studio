import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useDragControls, useMotionValue } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Github,
  X,
} from 'lucide-react';

import { useCancelImport, useImportJobs } from '@/entities/integration/model/queries';
import type { ImportStep, RepositoryImportJob } from '@/entities/integration/model/types';
import { STORAGE_KEYS } from '@/shared/config/constants';
import { useIsTouchDevice, useLocalStorage } from '@/shared/lib/hooks';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui';
import { useT, type TranslationKey } from '@/shared/i18n';
import { useImportTracker } from '../model/tracker.store';

/** The sentence drawn under the bar, per step. Exhaustive by construction. */
const STEP_LABEL: Record<ImportStep, TranslationKey> = {
  queued: 'importTracker.step.queued',
  resolving: 'importTracker.step.resolving',
  reading: 'importTracker.step.reading',
  analysing: 'importTracker.step.analysing',
  writing: 'importTracker.step.writing',
  inviting: 'importTracker.step.inviting',
  done: 'importTracker.step.done',
  // Never drawn: a stopped job shows its error or its cancellation instead.
  stopped: 'importTracker.step.done',
};

/**
 * How long a finished import keeps its card.
 *
 * Successes and cancellations clear themselves; failures do not. The asymmetry
 * is the point — a success has already handed over a button to the new project
 * and said what it made, and a cancellation is something the reader chose, so
 * both are answered questions. A failure is the one outcome nobody has read
 * yet, and clearing it after eight seconds is how an app loses an error
 * message.
 */
const AUTO_DISMISS_MS = 9_000;

const isLive = (job: RepositoryImportJob): boolean =>
  job.status === 'QUEUED' || job.status === 'RUNNING';

/**
 * A repository import, tracked without holding the app hostage.
 *
 * ## What this replaced
 *
 * A modal panel with a spinner in it, and a request the browser had to keep
 * open for as long as reading a repository through a model takes. While it ran
 * you could not do anything else — not because anything technical forbade it,
 * but because navigating away threw the import in the bin.
 *
 * This is the other half of that fix. The API turned the import into a job
 * (see `ImportRunner`); this is what makes the job *visible* while somebody
 * gets on with their afternoon. It is mounted by the app layout, so it
 * survives navigation; it is fed by a query and a socket, so it survives a
 * reload; and it can be moved out of the way, because "out of the way" is
 * different for every screen and every person.
 *
 * ## Why it is draggable rather than docked
 *
 * A fixed corner is always wrong for somebody. Bottom-right is where the chat
 * dock lives, bottom-centre is where toasts land on a phone, and top-right is
 * the notification bell. Rather than pick a corner and be wrong a third of the
 * time, it starts bottom-left and moves wherever it is put — with the position
 * remembered per device, exactly as the chat window's is.
 *
 * Only the title bar is a handle (`dragControls` + `dragListener={false}`).
 * The card carries a cancel button and a link to the finished project, and a
 * whole-surface drag would mean every attempt to press one of those nudged the
 * card instead.
 *
 * ## Why touch gets no drag
 *
 * On a phone the card is nearly the full width, so there is nowhere to park it
 * — and a drag handle there competes with the page's own scroll. It docks
 * above the safe-area inset instead, which is the same choice the chat window
 * makes on the same reasoning.
 */
export const ImportTracker = () => {
  const t = useT();
  const navigate = useNavigate();
  const isTouch = useIsTouchDevice();

  const { data: jobs = [] } = useImportJobs();
  const cancel = useCancelImport();
  const { dismissed, dismiss, isCollapsed, setCollapsed } = useImportTracker();

  const [storedPosition, setStoredPosition] = useLocalStorage(
    STORAGE_KEYS.importTrackerPosition,
    { x: 0, y: 0 },
  );
  const x = useMotionValue(storedPosition.x);
  const y = useMotionValue(storedPosition.y);
  const dragControls = useDragControls();

  const visible = jobs.filter((job) => !dismissed.has(job.id));

  /*
   * The success and failure announcements live here, not in the mutation.
   *
   * The mutation that starts an import returns a job that has done nothing
   * yet, so it has nothing true to announce. This component is watching the
   * job to completion anyway — on whichever tab happens to be open, including
   * one that did not start it — which makes it the only place that knows the
   * project now exists.
   *
   * `announced` is a ref rather than state on purpose: firing a toast must not
   * itself cause a render, and the set only ever grows within the life of a
   * tab. Toasts are keyed by job id so a socket redelivering the final event
   * across a reconnect cannot produce a second one.
   */
  const announced = useRef(new Set<string>());

  useEffect(() => {
    for (const job of jobs) {
      if (isLive(job) || announced.current.has(job.id)) continue;
      announced.current.add(job.id);

      if (job.status === 'SUCCEEDED') {
        toast.success(
          t('toast.projectReady', {
            name: job.fullName ?? job.payloadName ?? t('importTracker.aRepository'),
          }),
          {
            description: t(
              job.source === 'GITHUB' ? 'github.importedSummary' : 'boardImport.summary',
              {
                tasks: String(job.taskCount),
                documents: String(job.documentCount),
                invited: String(job.invitedCount),
              },
            ),
          },
        );
      } else if (job.status === 'FAILED') {
        toast.error(job.error ?? t('github.importFailed'));
      }
      // A cancellation says nothing. The reader pressed the button; being told
      // that the thing they cancelled was cancelled is noise.
    }
  }, [jobs, t]);

  /*
   * Finished cards clear themselves, except the ones nobody has read.
   *
   * One timer per job rather than one for the list: they finish at different
   * moments, and a shared timer would clear a failure that arrived a second
   * ago because a success from ten seconds earlier was due to go.
   */
  useEffect(() => {
    const timers = visible
      .filter((job) => job.status === 'SUCCEEDED' || job.status === 'CANCELLED')
      .map((job) => window.setTimeout(() => dismiss(job.id), AUTO_DISMISS_MS));

    return () => timers.forEach((timer) => window.clearTimeout(timer));
    // `visible` is derived per render; keying the effect on the ids it
    // contains means a progress update does not restart every timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible.map((job) => `${job.id}:${job.status}`).join(','), dismiss]);

  if (visible.length === 0) return null;

  return (
    <motion.aside
      aria-label={t('importTracker.title')}
      drag={!isTouch}
      dragListener={false}
      dragControls={dragControls}
      dragMomentum={false}
      dragElastic={0}
      /*
       * Keeps the card inside the viewport whatever the screen size. The
       * numbers are the card's own width and a generous height, so the handle
       * can always be reached again — a card dragged fully off-screen is one
       * the reader has to clear their site data to get back.
       */
      dragConstraints={{
        left: -24,
        right: window.innerWidth - 360,
        top: -window.innerHeight + 160,
        bottom: 24,
      }}
      style={isTouch ? undefined : { x, y }}
      onDragEnd={() => setStoredPosition({ x: x.get(), y: y.get() })}
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      className={cn(
        // `panel` rather than a hand-rolled border and shadow: it is the class
        // every floating surface in the app wears, and it is what carries the
        // active skin's radius, border style and paper texture. A card built
        // out of raw utilities would be the one window that stayed a Studio
        // card while the rest of the app turned into newsprint.
        'panel gpu fixed z-40 overflow-hidden',
        isTouch
          ? 'inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))]'
          : 'bottom-6 left-6 w-[min(22rem,calc(100vw-3rem))]',
      )}
    >
      {/* --- Title bar, which is also the handle ------------------------- */}
      <header
        onPointerDown={isTouch ? undefined : (event) => dragControls.start(event)}
        className={cn(
          'flex select-none items-center gap-2 border-b border-edge px-3 py-2',
          !isTouch && 'cursor-grab touch-none active:cursor-grabbing',
        )}
      >
        {!isTouch && (
          <GripVertical aria-hidden className="h-3.5 w-3.5 shrink-0 text-content-faint" />
        )}
        <Github aria-hidden className="h-3.5 w-3.5 shrink-0 text-brand" />
        <h2 className="min-w-0 flex-1 truncate text-xs font-semibold tracking-tight">
          {t('importTracker.title')}
        </h2>

        <button
          type="button"
          onClick={() => setCollapsed(!isCollapsed)}
          aria-expanded={!isCollapsed}
          aria-label={t(isCollapsed ? 'importTracker.expand' : 'importTracker.collapse')}
          className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-content-faint transition-colors hover:bg-surface-sunken hover:text-content"
        >
          {isCollapsed ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
      </header>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <ul className="divide-y divide-edge/70">
              {visible.map((job) => (
                <li key={job.id}>
                  <ImportRow
                    job={job}
                    onCancel={() => cancel.mutate(job.id)}
                    onDismiss={() => dismiss(job.id)}
                    onOpen={() => {
                      dismiss(job.id);
                      if (job.projectId) navigate(`/projects/${job.projectId}`);
                    }}
                  />
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
};

interface ImportRowProps {
  job: RepositoryImportJob;
  onCancel: () => void;
  onDismiss: () => void;
  onOpen: () => void;
}

const ImportRow = ({ job, onCancel, onDismiss, onOpen }: ImportRowProps) => {
  const t = useT();

  const live = isLive(job);
  const failed = job.status === 'FAILED';
  const cancelled = job.status === 'CANCELLED';
  const done = job.status === 'SUCCEEDED';

  /*
   * The repository's canonical name once GitHub has answered, and whatever was
   * pasted before that.
   *
   * The fallback matters more than it looks: the first two seconds of an
   * import are spent resolving the URL, and a card that says nothing at all
   * during them reads as broken. Showing the raw paste is honest and is
   * replaced by the real name the moment there is one.
   */
  const label = job.fullName ?? job.payloadName ?? job.sourceUrl;

  /*
   * A repository produces pages; a board produces columns.
   *
   * The API reuses one counter for both rather than carrying a fifth field
   * that is null on every GitHub row — see `documentCount` on the job — so the
   * *noun* is chosen here, from the source. It is the only thing this
   * component does with `source`, and the reason the field exists at all.
   */
  const summaryKey =
    job.source === 'GITHUB' ? 'github.importedSummary' : 'boardImport.summary';

  return (
    <div className="space-y-2 px-3 py-2.5">
      <div className="flex items-start gap-2">
        <span
          aria-hidden
          className={cn(
            'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md',
            done && 'bg-positive/12 text-positive',
            failed && 'bg-danger/12 text-danger',
            cancelled && 'bg-surface-sunken text-content-faint',
            live && 'bg-brand/12 text-brand',
          )}
        >
          {done ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : failed ? (
            <AlertTriangle className="h-3.5 w-3.5" />
          ) : (
            <Github className="h-3.5 w-3.5" />
          )}
        </span>

        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-2xs font-semibold" title={label}>
            {label}
          </p>
          <p
            className={cn(
              'mt-0.5 line-clamp-2 text-3xs',
              failed ? 'text-danger' : 'text-content-muted',
            )}
          >
            {failed
              ? (job.error ?? t('github.importFailed'))
              : cancelled
                ? t('importTracker.cancelled')
                : job.isCancelling
                  ? t('importTracker.cancelling')
                  : t(STEP_LABEL[job.step])}
          </p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('importTracker.dismiss')}
          className="grid h-5 w-5 shrink-0 place-items-center rounded text-content-faint transition-colors hover:bg-surface-sunken hover:text-content"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* --- The bar ----------------------------------------------------- */}
      {live && (
        <div
          role="progressbar"
          aria-valuenow={job.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('importTracker.title')}
          className="h-1 overflow-hidden rounded-full bg-surface-sunken"
        >
          {/*
            Animated by width rather than by a CSS transition on a transform,
            because the track is what the number means: a bar scaled from the
            centre reads as a loading shimmer, and this is a real proportion.
          */}
          <motion.div
            className={cn('h-full rounded-full', job.isCancelling ? 'bg-warning' : 'bg-brand')}
            initial={false}
            animate={{ width: `${Math.min(100, Math.max(0, job.progress))}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 22 }}
          />
        </div>
      )}

      {/* --- What to do about it ----------------------------------------- */}
      <div className="flex items-center gap-1.5">
        {live && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onCancel}
            // A cancel already asked for cannot be asked for again — the runner
            // notices it at the next step boundary and the button has nothing
            // left to say until then.
            disabled={job.isCancelling}
            className="h-6 px-2 text-3xs"
          >
            {t(job.isCancelling ? 'importTracker.cancelling' : 'common.cancel')}
          </Button>
        )}

        {done && job.projectId && (
          <Button size="sm" onClick={onOpen} className="h-6 px-2 text-3xs">
            {t('importTracker.openProject')}
          </Button>
        )}

        {done && (
          <span className="ml-auto text-3xs tabular-nums text-content-faint">
            {t(summaryKey, {
              tasks: String(job.taskCount),
              documents: String(job.documentCount),
              invited: String(job.invitedCount),
            })}
          </span>
        )}
      </div>
    </div>
  );
};
