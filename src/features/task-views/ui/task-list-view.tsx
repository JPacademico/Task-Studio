import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, Check, ListChecks, Pin, Trash2 } from 'lucide-react';

import { useIsTaskSyncing } from '@/entities/task/model/sync.store';
import type { Task, TaskStatus } from '@/entities/task/model/types';
import { TaskOrigin } from '@/entities/task/ui/task-origin';
import { TASK_PRIORITY_META, TASK_STATUS_META } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { formatDeadline, formatDeadlineDate } from '@/shared/lib/dates';
import { AvatarStack, Badge, EmptyState, PostItMark } from '@/shared/ui';
import { useT, type Translate } from '@/shared/i18n';

export interface TaskViewProps {
  tasks: Task[];
  onOpen: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onTogglePin: (task: Task) => void;
  onDelete: (task: Task) => void;
  /** The personal surface mixes projects, so each row says where it lives. */
  showProjectLink?: boolean;
}

const ORDER: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'COMPLETED'];

interface TaskRowProps extends Pick<TaskViewProps, 'onOpen' | 'onToggleComplete' | 'onTogglePin' | 'onDelete' | 'showProjectLink'> {
  task: Task;
  t: Translate;
}

/**
 * One line of the list.
 *
 * Lifted out of the `.map` it used to live in, for two reasons that arrived
 * together. The immediate one is that it needs `useIsTaskSyncing`, and a hook
 * cannot be called inside a loop body. The lasting one is that a component can
 * be memoised and a fragment of JSX cannot — so a list of two hundred rows now
 * re-renders only the row that changed, which is the same treatment `TaskCard`
 * has had since the board was written.
 *
 * The memo holds because every handler comes down from one `useMemo`d object in
 * the page above (see the project page's `taskHandlers`) and `t` is memoised on
 * the locale.
 */
const TaskRowBase = ({
  task,
  t,
  onOpen,
  onToggleComplete,
  onTogglePin,
  onDelete,
  showProjectLink,
}: TaskRowProps) => {
  const isDone = task.status === 'COMPLETED';
  // A write of this task's own is still in the air — see the store's note.
  const isSyncing = useIsTaskSyncing(task.id);

  return (
    <motion.li
      layout="position"
      className={cn(
        'group/row relative flex items-center gap-2.5 border-b border-edge/60 px-2.5 py-2 last:border-b-0',
        'transition-colors duration-150 hover:bg-surface-sunken/60',
        isDone && 'opacity-65',
      )}
    >
      <span
        aria-hidden
        className="h-7 w-1 shrink-0 rounded-full"
        style={{ backgroundColor: task.color }}
      />

      <button
        type="button"
        // Same lock as the card's box — see `TaskCard`.
        disabled={!task.isMine || isSyncing}
        aria-busy={isSyncing || undefined}
        title={task.isMine ? undefined : t('views.assigneesOnly')}
        aria-label={t(task.isCompletedByMe ? 'views.markNotDone' : 'task.markDone')}
        onClick={() => onToggleComplete(task)}
        className={cn(
          'grid h-[1.125rem] w-[1.125rem] shrink-0 place-items-center rounded border transition-colors duration-150',
          task.isCompletedByMe || isDone
            ? 'border-positive bg-positive text-white'
            : 'border-check bg-surface-sunken/40',
          task.isMine ? 'hover:border-brand' : 'cursor-default opacity-60',
          isSyncing && 'cursor-progress',
        )}
      >
        {(task.isCompletedByMe || isDone) && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
      </button>

      <button type="button" onClick={() => onOpen(task)} className="min-w-0 flex-1 text-left">
        <span
          className={cn(
            'flex items-center gap-1.5 truncate text-sm font-medium',
            isDone && 'line-through decoration-content-faint',
          )}
        >
          {task.title}
          {task.notes.length > 0 && (
            <PostItMark count={task.notes.length} className="h-3.5 w-3.5 shrink-0 text-amber-400" />
          )}
        </span>
      </button>

      <span className="hidden shrink-0 items-center gap-1.5 md:flex">
        {task.priority !== 'NORMAL' && (
          <span
            className={cn(
              'text-3xs font-bold uppercase tracking-wide',
              TASK_PRIORITY_META[task.priority].className,
            )}
          >
            {t(TASK_PRIORITY_META[task.priority].label)}
          </span>
        )}

        {task.noteProgress.total > 0 && (
          <Badge>
            <ListChecks className="h-3 w-3" />
            {task.noteProgress.done}/{task.noteProgress.total}
          </Badge>
        )}
      </span>

      {showProjectLink && (
        <TaskOrigin project={task.project} variant="inline" className="hidden lg:flex" />
      )}

      <span
        className={cn(
          'hidden w-[7.5rem] shrink-0 items-center justify-end gap-1 text-2xs tabular-nums sm:flex',
          task.isLate ? 'text-danger' : 'text-content-faint',
        )}
      >
        {task.dueAt && (
          <>
            <CalendarClock className="h-3 w-3" />
            {isDone ? formatDeadlineDate(task.dueAt) : formatDeadline(task.dueAt)}
          </>
        )}
      </span>

      <span className="hidden shrink-0 sm:block">
        <AvatarStack people={task.assignees} max={2} />
      </span>

      <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover/row:opacity-100">
        <button
          type="button"
          aria-label={t(task.isPinned ? 'views.unpinTask' : 'views.pinTask')}
          onClick={() => onTogglePin(task)}
          className={cn(
            'rounded-lg p-1.5 transition-colors',
            task.isPinned ? 'text-brand' : 'text-content-faint hover:text-content',
          )}
        >
          <Pin className={cn('h-3.5 w-3.5', task.isPinned && 'fill-current')} />
        </button>
        <button
          type="button"
          aria-label={t('views.moveToBin')}
          onClick={() => onDelete(task)}
          className="rounded-lg p-1.5 text-content-faint transition-colors hover:text-danger"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </span>
    </motion.li>
  );
};

const TaskRow = memo(TaskRowBase);
TaskRow.displayName = 'TaskRow';

/**
 * One line per task.
 *
 * The card layouts are for arranging work; this one is for reading a lot of it
 * at once, so every row is the same height and the eye can run down a single
 * column of titles instead of hopping between boxes.
 */
export const TaskListView = ({
  tasks,
  onOpen,
  onToggleComplete,
  onTogglePin,
  onDelete,
  showProjectLink,
}: TaskViewProps) => {
  const t = useT();
  const groups = useMemo(
    () =>
      ORDER.map((status) => ({
        status,
        items: tasks.filter((task) => task.status === status),
      })).filter((group) => group.items.length > 0),
    [tasks],
  );

  if (tasks.length === 0) {
    return <EmptyState title={t('views.nothingToList')} description={t('views.noMatch')} />;
  }

  return (
    <div className="space-y-5">
      {groups.map(({ status, items }) => {
        const meta = TASK_STATUS_META[status];

        return (
          <section key={status} className="space-y-1.5">
            <header className="flex items-center gap-2.5 px-1">
              <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-content-muted">
                {t(meta.label)}
              </h3>
              <span className="h-px flex-1 bg-edge/70" />
              <span className="text-2xs tabular-nums text-content-faint">{items.length}</span>
            </header>

            <ol className="overflow-hidden rounded-2xl border border-edge bg-surface-raised">
              {/* No AnimatePresence: with no entrance or exit to play, it is
                  pure bookkeeping on every row. See `TaskCard`. */}
              {items.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  t={t}
                  onOpen={onOpen}
                  onToggleComplete={onToggleComplete}
                  onTogglePin={onTogglePin}
                  onDelete={onDelete}
                  showProjectLink={showProjectLink}
                />
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
};
