import { memo } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarClock,
  Check,
  ImageIcon,
  ListChecks,
  Pin,
  Trash2,
  UserCheck,
} from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { withAlpha } from '@/shared/lib/colors';
import { formatDeadline, formatDeadlineDate, formatWindow } from '@/shared/lib/dates';
import { TASK_PRIORITY_META } from '@/shared/config/constants';
import { AvatarStack, Badge, PostItMark } from '@/shared/ui';
import { completionProgress, isSharedTask, outstandingAssignees } from '../lib/completion';
import { useIsTaskSyncing } from '../model/sync.store';
import type { Task } from '../model/types';
import { TaskOrigin } from './task-origin';
import { TaskTypeTag } from './task-type-tag';
import { translate, useT } from '@/shared/i18n';

/**
 * The lateness stamp.
 *
 * Drawn as a slightly rotated, notched label so it reads as something stuck
 * onto the card after the fact — the way a real "OVERDUE" stamp would — instead
 * of another neutral pill in the badge row.
 */
export const LateTag = ({ variant }: { variant: 'late' | 'completed-late' }) => {
  const isOpen = variant === 'late';

  return (
    <motion.span
      initial={{ scale: 0.7, rotate: -8, opacity: 0 }}
      animate={{ scale: 1, rotate: -2.5, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 480, damping: 18 }}
      title={isOpen ? 'Past its deadline and still open' : 'Finished after the deadline'}
      className={cn(
        'inline-flex items-center gap-1 rounded-[4px] border px-1.5 py-0.5',
        'text-[10px] font-black uppercase tracking-[0.09em]',
        isOpen
          ? 'border-danger/50 bg-danger/12 text-danger shadow-[0_2px_8px_-4px_rgb(var(--danger)/0.8)]'
          : 'border-warning/50 bg-warning/12 text-warning',
      )}
    >
      <span
        aria-hidden
        className={cn('h-1.5 w-1.5 rounded-full', isOpen ? 'bg-danger' : 'bg-warning')}
      />
      {translate(isOpen ? 'views.lateTag' : 'views.doneLateTag')}
    </motion.span>
  );
};

interface TaskCardProps {
  task: Task;
  onOpen?: (task: Task) => void;
  onToggleComplete?: (task: Task) => void;
  onTogglePin?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  isDragging?: boolean;
  className?: string;
  compact?: boolean;
  /**
   * Surfaces the owning project as a link. On by default nowhere: inside a
   * project board it would say the same thing on every card, but on the
   * personal agenda — which mixes every project the user is on — it is the
   * fastest way back to where the work actually lives.
   */
  showProjectLink?: boolean;
}

/**
 * The primary task surface. The colour the user picks tints the whole card via
 * a left rail plus a translucent wash, so a board stays scannable at a glance.
 *
 * Memoised: a board can hold a few hundred of these, and every one of them runs
 * a layout animation, so a filter keystroke or a layout switch re-rendering the
 * whole set is the difference between instant and janky. The callers hand down
 * one memoised handler object, which is what makes the comparison hold.
 */
const TaskCardBase = ({
  task,
  onOpen,
  onToggleComplete,
  onTogglePin,
  onDelete,
  isDragging,
  className,
  compact,
  showProjectLink,
}: TaskCardProps) => {
  const t = useT();
  const isDone = task.status === 'COMPLETED';

  /*
   * A write of this task's own is still in the air.
   *
   * Subscribed here rather than passed down, so a board of several hundred
   * cards costs no prop plumbing and re-renders exactly the one card whose
   * answer changed. See `entities/task/model/sync.store`.
   */
  const isSyncing = useIsTaskSyncing(task.id);

  /*
   * What the card marks in its corner, rather than spells out in its footer.
   *
   * Both of these answer "is there something else attached to this?", which is
   * a yes/no a glyph says faster than a labelled pill — and the footer is where
   * the card's genuinely varying information lives (deadline, priority,
   * sign-off, progress). A note already worked this way; the attachment used to
   * spend a whole badge and the word "Image" saying the same thing.
   */
  const hasNote = task.noteCount > 0;
  const markerCount = (hasNote ? 1 : 0) + (task.attachmentUrl ? 1 : 0);

  // A task several people carry needs all of their ticks, so the card has to
  // say how many it has — otherwise "why is this still open?" has no answer on
  // the surface where it is asked. See `lib/completion.ts`.
  const isShared = isSharedTask(task);
  const signOff = completionProgress(task);

  return (
    <motion.article
      layout="position"
      /*
       * No entrance animation, deliberately.
       *
       * Every card used to fade and rise on mount. On one card that reads as
       * polish; on a board it is the whole point of the page arriving in a
       * blur, and it made *already-cached* data look like it was still loading
       * — the animation runs on mount regardless of where the data came from,
       * so a list served instantly from cache was still hidden for the length
       * of a spring. Now the tasks are simply there.
       *
       * `layout="position"` stays: that animates a card *moving* — reordering,
       * a status change, a column drop — which is a real state change worth
       * showing, and it never delays first paint. `transition` is kept because
       * it configures that, not an entrance.
       */
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      className={cn(
        'ui-card gpu group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-edge',
        'bg-surface-raised p-4 text-left transition-shadow duration-200',
        isDragging ? 'shadow-glow' : 'hover:shadow-panel',
        isDone && 'opacity-70',
        className,
      )}
      style={{ background: `linear-gradient(120deg, ${withAlpha(task.color, 0.1)}, transparent 55%)` }}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: task.color }}
      />

      {/* What is stuck to this card, marked on the corner the way a real note
          or a clipped photograph would be, rather than hiding in the badge row.

          Inside the padding box, not straddling it: the card clips its own
          overflow (for the colour rail), so a marker hung off the corner was
          being sliced in half. */}
      {markerCount > 0 && (
        <span className="absolute right-1.5 top-1.5 z-10 flex items-center gap-1">
          {task.attachmentUrl && (
            <span
              title={t('task.hasImage')}
              aria-label={t('task.hasImage')}
              className="text-content-faint drop-shadow-[0_2px_3px_rgb(0_0_0/0.35)]"
            >
              <ImageIcon className="h-[15px] w-[15px]" strokeWidth={2.2} />
            </span>
          )}

          {hasNote && (
            <span
              title={
                task.noteAuthors.length > 0
                  ? `${task.noteCount} note(s) from ${task.noteAuthors
                      .map((author) => author.displayName)
                      .join(', ')}`
                  : `${task.noteCount} note(s)`
              }
              className="text-amber-400 drop-shadow-[0_2px_3px_rgb(0_0_0/0.35)]"
            >
              <PostItMark count={task.noteCount} className="h-[18px] w-[18px]" />
            </span>
          )}
        </span>
      )}

      <header className="flex items-start gap-3 pl-2">
        {/* Only an assignee owns the completion of a task, so for everybody
            else the box is a read-out rather than a control that fails. */}
        {onToggleComplete && (
          <button
            type="button"
            /*
             * Locked while its own write is in flight.
             *
             * The tick itself is already instant — the cache is patched before
             * the request leaves — so this costs the user nothing they can
             * feel. What it buys is that a second click cannot start a second
             * write for the same row, which is what used to let a quick
             * tick-untick settle as "done", flash back and settle again.
             */
            disabled={!task.isMine || isSyncing}
            aria-busy={isSyncing || undefined}
            title={
              !task.isMine
                ? 'Only the people this task is assigned to can complete it.'
                : isShared
                  ? 'Ticks your own box. The task is only done once every assignee has ticked theirs.'
                  : undefined
            }
            aria-label={
              task.isMine
                ? task.isCompletedByMe
                  ? 'Mark as not done'
                  : 'Mark as done'
                : 'Completion is owned by the assignees'
            }
            onClick={(event) => {
              event.stopPropagation();
              onToggleComplete(task);
            }}
            className={cn(
              'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-all duration-150',
              task.isCompletedByMe || isDone
                ? 'border-positive bg-positive text-white'
                // `border-check`, not `border-edge`: an empty box has nothing
                // but its outline to be found by, and `--edge` is tuned to
                // vanish. See the token note in `app/styles/index.css`.
                : 'border-check bg-surface-sunken/40',
              task.isMine ? 'hover:border-brand' : 'cursor-default opacity-60',
              // Not `opacity-50`: the box has just been ticked and the tick is
              // the thing being confirmed, so it stays fully drawn. Only the
              // cursor says the control is momentarily closed.
              isSyncing && 'cursor-progress',
            )}
          >
            {(task.isCompletedByMe || isDone) && <Check className="h-3 w-3" strokeWidth={3} />}
          </button>
        )}

        <button
          type="button"
          onClick={() => onOpen?.(task)}
          className="flex-1 text-left focus-visible:outline-none"
        >
          {/*
            Title only.

            The description used to sit under it on every card, which on a
            board of twenty made the column a wall of prose to scan past — and
            the two clamped lines were rarely the two that mattered. It belongs
            to the task, not to the summary of it, so it lives in the detail
            modal that opening the card already gives you.
          */}
          <h3
            className={cn(
              'text-sm font-semibold leading-snug text-balance',
              isDone && 'line-through decoration-content-faint',
            )}
          >
            {task.title}
          </h3>
        </button>

        <div
          className={cn(
            'flex shrink-0 items-center gap-1 opacity-0 transition-opacity',
            'group-hover:opacity-100 focus-within:opacity-100',
            // Leave the corner free for whatever is pinned to it — one marker
            // or two, so the row does not slide under them.
            markerCount === 1 && 'mr-5',
            markerCount === 2 && 'mr-11',
          )}
        >
          {onTogglePin && (
            <button
              type="button"
              aria-label={task.isPinned ? 'Unpin task' : 'Pin task'}
              onClick={() => onTogglePin(task)}
              className={cn(
                'rounded-lg p-1.5 transition-colors',
                task.isPinned ? 'text-brand' : 'text-content-faint hover:text-content',
              )}
            >
              <Pin className={cn('h-3.5 w-3.5', task.isPinned && 'fill-current')} />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              aria-label={t('views.moveToBin')}
              onClick={() => onDelete(task)}
              className="rounded-lg p-1.5 text-content-faint transition-colors hover:text-danger"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </header>

      <footer className="flex flex-wrap items-center gap-2 pl-2">
        <TaskTypeTag type={task.type} />

        {/*
          No status badge.

          Every surface that draws these cards already says the status *around*
          them — the board by column, the list and the sprint view by grouped
          heading — and the detail sheet says it again when you open one. So the
          badge repeated, on every card, a fact the reader had just been told by
          the thing they were looking at. The card keeps the two cues that carry
          it without a label: a completed task fades and strikes its own title.
        */}

        {/* Lateness gets its own loud tag rather than a whole extra column. */}
        {task.isLate && <LateTag variant="late" />}
        {task.isCompletedLate && <LateTag variant="completed-late" />}

        {task.dueAt && (
          <Badge className={cn(task.isLate && 'border-danger/40 text-danger')}>
            <CalendarClock className="h-3 w-3" />
            {/* A finished task gets the date it was due, not a running
                countdown — "2d late" on delivered work reads as still overdue. */}
            {isDone ? formatDeadlineDate(task.dueAt) : formatDeadline(task.dueAt)}
          </Badge>
        )}

        {task.priority !== 'NORMAL' && (
          <Badge className={TASK_PRIORITY_META[task.priority].className}>
            {t(TASK_PRIORITY_META[task.priority].label)}
          </Badge>
        )}

        {/* Shared work: how many of the people carrying it have signed off. */}
        {isShared && !isDone && (
          <Badge
            title={
              signOff.done === signOff.total
                ? 'Everyone has ticked their box.'
                : `Waiting on ${outstandingAssignees(task)
                    .map((assignee) => assignee.displayName)
                    .join(', ')}`
            }
            className={cn(
              signOff.done === signOff.total && 'border-positive/40 text-positive',
            )}
          >
            <UserCheck className="h-3 w-3" />
            {t('views.signedOff', { done: signOff.done, total: signOff.total })}
          </Badge>
        )}

        {task.checklistProgress.total > 0 && (
          <Badge>
            <ListChecks className="h-3 w-3" />
            {task.checklistProgress.done}/{task.checklistProgress.total}
          </Badge>
        )}

        <span className="ml-auto flex items-center gap-2">
          {!compact && formatWindow(task.startAt, task.dueAt) && (
            <span className="hidden text-[11px] text-content-faint sm:inline">
              {formatWindow(task.startAt, task.dueAt)}
            </span>
          )}

          {/* Where this task actually lives. Carries the project's own colour so
              a mixed agenda stays scannable by source, not just by date — or
              says "Personal" when there is no project behind it at all. */}
          {showProjectLink && <TaskOrigin project={task.project} />}

          <AvatarStack people={task.assignees} max={3} />
        </span>
      </footer>
    </motion.article>
  );
};

export const TaskCard = memo(TaskCardBase);
TaskCard.displayName = 'TaskCard';
