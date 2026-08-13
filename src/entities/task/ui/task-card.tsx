import { memo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  CalendarClock,
  Check,
  ListChecks,
  Paperclip,
  Pin,
  Trash2,
  UserCheck,
} from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { withAlpha } from '@/shared/lib/colors';
import { formatDeadline, formatDeadlineDate, formatWindow } from '@/shared/lib/dates';
import { TASK_PRIORITY_META, TASK_STATUS_META } from '@/shared/config/constants';
import { AvatarStack, Badge, PostItMark } from '@/shared/ui';
import { completionProgress, isSharedTask, outstandingAssignees } from '../lib/completion';
import type { Task } from '../model/types';
import { TaskTypeTag } from './task-type-tag';

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
      {isOpen ? 'Late' : 'Done late'}
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
  const statusMeta = TASK_STATUS_META[task.status];
  const isDone = task.status === 'COMPLETED';

  // A task several people carry needs all of their ticks, so the card has to
  // say how many it has — otherwise "why is this still open?" has no answer on
  // the surface where it is asked. See `lib/completion.ts`.
  const isShared = isSharedTask(task);
  const signOff = completionProgress(task);

  return (
    <motion.article
      layout="position"
      // Only transform/opacity animate — never width/height — to stay on the
      // compositor thread at 60fps on mobile.
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
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

      {/* Somebody stuck a note on this one — the paper sits on the corner the
          way a real one would, rather than hiding in the badge row.

          Inside the padding box, not straddling it: the card clips its own
          overflow (for the colour rail), so a marker hung off the corner was
          being sliced in half. */}
      {task.noteCount > 0 && (
        <span
          title={
            task.noteAuthors.length > 0
              ? `${task.noteCount} note(s) from ${task.noteAuthors
                  .map((author) => author.displayName)
                  .join(', ')}`
              : `${task.noteCount} note(s)`
          }
          className="absolute right-1.5 top-1.5 z-10 text-amber-400 drop-shadow-[0_2px_3px_rgb(0_0_0/0.35)]"
        >
          <PostItMark count={task.noteCount} className="h-[18px] w-[18px]" />
        </span>
      )}

      <header className="flex items-start gap-3 pl-2">
        {/* Only an assignee owns the completion of a task, so for everybody
            else the box is a read-out rather than a control that fails. */}
        {onToggleComplete && (
          <button
            type="button"
            disabled={!task.isMine}
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
                : 'border-edge',
              task.isMine ? 'hover:border-brand' : 'cursor-default opacity-60',
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
            // Leave the corner free when a note marker is pinned to it.
            task.noteCount > 0 && 'mr-5',
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
              aria-label="Move to recycle bin"
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
        <Badge dot={statusMeta.dot}>{statusMeta.label}</Badge>

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
            {TASK_PRIORITY_META[task.priority].label}
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
            {signOff.done}/{signOff.total} signed off
          </Badge>
        )}

        {task.checklistProgress.total > 0 && (
          <Badge>
            <ListChecks className="h-3 w-3" />
            {task.checklistProgress.done}/{task.checklistProgress.total}
          </Badge>
        )}

        {task.attachmentUrl && (
          <Badge>
            <Paperclip className="h-3 w-3" />
            Image
          </Badge>
        )}

        <span className="ml-auto flex items-center gap-2">
          {!compact && formatWindow(task.startAt, task.dueAt) && (
            <span className="hidden text-[11px] text-content-faint sm:inline">
              {formatWindow(task.startAt, task.dueAt)}
            </span>
          )}

          {/* Where this task actually lives. Carries the project's own colour so
              a mixed agenda stays scannable by source, not just by date. */}
          {showProjectLink && (
            <Link
              to={`/projects/${task.project.id}`}
              onClick={(event) => event.stopPropagation()}
              title={`Open ${task.project.name}`}
              className={cn(
                'group/link inline-flex max-w-[9rem] items-center gap-1.5 rounded-full border px-2 py-0.5',
                'text-[11px] font-medium transition-all duration-150',
                'border-edge text-content-muted hover:-translate-y-px hover:border-brand hover:text-brand',
              )}
            >
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: task.project.color }}
              />
              <span className="truncate">{task.project.name}</span>
              <ArrowUpRight
                className="h-3 w-3 shrink-0 transition-transform duration-150 group-hover/link:translate-x-px group-hover/link:-translate-y-px"
                strokeWidth={2.6}
              />
            </Link>
          )}

          <AvatarStack people={task.assignees} max={3} />
        </span>
      </footer>
    </motion.article>
  );
};

export const TaskCard = memo(TaskCardBase);
TaskCard.displayName = 'TaskCard';
