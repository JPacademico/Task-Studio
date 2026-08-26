import { CalendarClock, Check } from 'lucide-react';

import type { GroupedTask } from '@/entities/task-group/model/types';
import { TASK_PRIORITY_META, TASK_STATUS_META } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { withAlpha } from '@/shared/lib/colors';
import { formatDateTime, formatDeadlineDate } from '@/shared/lib/dates';
import { AvatarStack } from '@/shared/ui';
import { useT } from '@/shared/i18n';

interface GroupTaskCardProps {
  task: GroupedTask;
  onOpen?: (taskId: string) => void;
  isDragging?: boolean;
  className?: string;
}

/**
 * The status ribbon's colour, per state.
 *
 * Token classes rather than raw hex, so every skin restyles the ribbon with the
 * rest of its palette — `bg-positive` on the newsprint skin is not the green it
 * is on the studio one, and a hard-coded `#22c55e` would be the one element on
 * the board that ignored the theme.
 *
 * Lateness is a fourth state that `TaskStatus` does not have a value for, so it
 * is handled at the call site rather than being smuggled into this table.
 */
const RIBBON: Record<GroupedTask['status'], string> = {
  TODO: 'bg-content-faint/25 text-content-muted',
  IN_PROGRESS: 'bg-warning/20 text-warning',
  COMPLETED: 'bg-positive/20 text-positive',
};

/**
 * One task, as the grouping board draws it.
 *
 * ## Why this is not `TaskCard`
 *
 * Because the two boards ask different questions, and the answer changes what
 * belongs on the card. The status board's columns already *say* the state, so
 * its cards carry a deadline, a priority, sign-off progress and a note count —
 * everything that varies within a column. This board's columns say a category
 * the project invented, and the state is the thing that varies inside one — so
 * the state comes to the front, as a ribbon across the top, and the rest is
 * stripped back to what fits under it.
 *
 * That is also why the two do not share a component with a `variant` flag. They
 * agree on almost nothing: not the fields, not the density, not the gestures
 * (there is no complete-toggle, pin or delete here — this board is for looking
 * at the shape of the work, and every one of those actions has a home on the
 * board that owns it). A shared card would be two cards behind one `if`.
 */
export const GroupTaskCard = ({ task, onOpen, isDragging, className }: GroupTaskCardProps) => {
  const t = useT();

  const isDone = task.status === 'COMPLETED';
  const priority = TASK_PRIORITY_META[task.priority];

  return (
    <article
      onClick={onOpen ? () => onOpen(task.id) : undefined}
      className={cn(
        'gpu group/gcard overflow-hidden rounded-xl border border-edge bg-surface-raised',
        'transition-colors duration-150',
        onOpen && 'cursor-pointer hover:border-brand/50',
        isDragging && 'shadow-xl ring-1 ring-brand/40',
        isDone && 'opacity-75',
        className,
      )}
      style={{
        // The task's own colour as a hairline down the left edge — the same
        // cue `TaskCard` uses, so a task is recognisable across both boards.
        boxShadow: `inset 3px 0 0 0 ${withAlpha(task.color, 0.9)}`,
      }}
    >
      {/*
        The status, as a label rather than as a column.

        This is the whole reason the grouping board can exist alongside the
        status board without the two contradicting each other: there is exactly
        one place a task's state is *set* — dragging on the status board — and
        here it is reported. A reader gets both facts at once ("this is
        wireframe work, and it is in progress") without either board having to
        pretend to be the other.
      */}
      <p
        className={cn(
          'px-2.5 py-1 text-center text-[10px] font-semibold uppercase tracking-[0.14em]',
          // Late work overrides the state's own colour. "In progress" and "in
          // progress, three days past its deadline" are not the same news, and
          // the second one has to survive being glanced at.
          task.isLate ? 'bg-danger/20 text-danger' : RIBBON[task.status],
        )}
      >
        {task.isLate ? t('views.late') : t(TASK_STATUS_META[task.status].label)}
      </p>

      <div className="space-y-2 p-2.5">
        <h4
          className={cn(
            'line-clamp-2 break-words text-[13px] font-semibold leading-snug',
            isDone && 'text-content-muted line-through',
          )}
        >
          {task.title}
        </h4>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-content-faint">
          {/*
            Finished work says when it *was* finished; open work says when it is
            due. Same rule as `TaskCard`, for the same reason: on something
            already delivered the deadline is a prediction nobody needs any more.
          */}
          {isDone && task.completedAt ? (
            <span
              title={t('views.completedOn', { date: formatDateTime(task.completedAt) })}
              className="inline-flex items-center gap-1 font-semibold text-positive"
            >
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
              {formatDeadlineDate(task.completedAt)}
            </span>
          ) : (
            task.dueAt && (
              <span
                title={formatDateTime(task.dueAt)}
                className={cn('inline-flex items-center gap-1', task.isLate && 'text-danger')}
              >
                <CalendarClock className="h-2.5 w-2.5" />
                {formatDeadlineDate(task.dueAt)}
              </span>
            )
          )}

          {task.priority !== 'NORMAL' && (
            <span className={cn('font-semibold uppercase', priority.className)}>
              {t(priority.label)}
            </span>
          )}

          <span className="ml-auto">
            <AvatarStack people={task.assignees} max={3} />
          </span>
        </div>
      </div>
    </article>
  );
};
