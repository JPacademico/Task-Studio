import { useMemo } from 'react';
import { CalendarClock, Check } from 'lucide-react';

import type { GroupedTask } from '@/entities/task-group/model/types';
import { TASK_PRIORITY_META, TASK_STATUS_META } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { useCardPress } from '@/shared/lib/use-card-press';
import { withAlpha } from '@/shared/lib/colors';
import { formatDateTime, formatDeadlineDate } from '@/shared/lib/dates';
import { AvatarStack } from '@/shared/ui';
import { useT } from '@/shared/i18n';

interface GroupTaskCardProps {
  task: GroupedTask;
  onOpen?: (taskId: string) => void;
  /**
   * Ticks the card off, when this reader is allowed to.
   *
   * Omitted — rather than passed and disabled — for everybody who is neither an
   * assignee nor an admin. Same reasoning as the status board: a box that
   * cannot be ticked is a control that fails, and the server would refuse the
   * write anyway. `canManage` says which of the two kinds of tick it is; see
   * `useToggleGroupTaskCompletion`.
   */
  onToggleComplete?: (task: GroupedTask) => void;
  /** True when the reader is an owner/admin, which widens what the box may do. */
  canManage?: boolean;
  /** Locked while this card's own write is in flight. */
  isSyncing?: boolean;
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
 * agree on almost nothing: not the fields, not the density, not the gestures.
 *
 * ## The one gesture that came back
 *
 * The tick box. This card used to have none, on the reasoning that this board
 * is about *where* work sits and the other one is about what state it is in.
 * What that missed is that dragging and ticking are not the same act: the thing
 * worth guarding against was a *drag* silently completing somebody's work, an
 * accident of a few pixels. A labelled checkbox is deliberate, and it is the
 * most-used control in the app — refusing it here meant leaving the board you
 * were reading to tick a box you could already see.
 *
 * It still cannot be triggered by dragging: the box swallows its own pointer
 * events, so the drag sensor never sees the press that ticks it.
 */
export const GroupTaskCard = ({
  task,
  onOpen,
  onToggleComplete,
  canManage,
  isSyncing,
  isDragging,
  className,
}: GroupTaskCardProps) => {
  const t = useT();

  const isDone = task.status === 'COMPLETED';
  const priority = TASK_PRIORITY_META[task.priority];
  const isShared = task.signOff.total > 1;

  /*
   * Ticked, from this reader's point of view.
   *
   * `isCompletedByMe` rather than the task's own status, and the difference is
   * the whole point on a shared task: my box is ticked the moment I tick it,
   * even though the task stays open until the last assignee does the same. An
   * admin who is not on the task has no row of their own, so for them the
   * task's status *is* the answer.
   */
  const isTicked = task.isMine ? task.isCompletedByMe : isDone;

  /*
   * The card opened on a bare `onClick`, which on a board whose whole point is
   * dragging meant every drop landed the reader in a modal over the board they
   * had just rearranged. `useCardPress` measures the press against the same
   * thresholds the drag sensor uses, so a gesture is one thing or the other and
   * never both.
   */
  const openTask = useMemo(
    () => (onOpen ? () => onOpen(task.id) : undefined),
    [onOpen, task.id],
  );
  const cardPress = useCardPress(openTask);

  return (
    <article
      {...cardPress}
      className={cn(
        'gpu group/gcard overflow-hidden rounded-xl border border-edge bg-surface-raised',
        'transition-colors duration-150',
        openTask && 'cursor-pointer hover:border-brand/50',
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
        The status, as a label rather than as a column — with the tick box in
        the same strip.

        The two belong together: the ribbon reports the state and the box is the
        one way to change it from here, so putting them on one line means the
        card gains a control without gaining a row. The label stays centred on
        the card rather than on the space left over, so a board of cards reads
        as a column of centred ribbons whether or not the reader can tick them.
      */}
      <div
        className={cn(
          'relative flex items-center px-2.5 py-1',
          task.isLate ? 'bg-danger/20 text-danger' : RIBBON[task.status],
        )}
      >
        {onToggleComplete && (
          <button
            type="button"
            /*
             * Locked while its own write is in flight.
             *
             * The tick is already instant — the board's cache is patched before
             * the request leaves — so this costs nothing anybody can feel. What
             * it buys is that a second click cannot start a second write for
             * the same row, which is what lets a quick tick-untick settle as
             * "done", flash back and settle again.
             */
            disabled={isSyncing}
            aria-busy={isSyncing || undefined}
            aria-pressed={isTicked}
            aria-label={t(isTicked ? 'task.markPending' : 'task.markDone')}
            title={t(
              !task.isMine && canManage
                ? 'groups.completeAsAdmin'
                : isShared
                  ? 'groups.completeShared'
                  : isTicked
                    ? 'task.markPending'
                    : 'task.markDone',
            )}
            /*
             * The drag sensor never sees this press.
             *
             * dnd-kit's listeners sit on the wrapper around this card, and they
             * bind on pointerdown. `stopPropagation` there is what keeps a tick
             * from also being the first millimetre of a drag — the activation
             * distance makes that unlikely rather than impossible, and on touch
             * a hold over the box would otherwise pick the card up.
             */
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onToggleComplete(task);
            }}
            className={cn(
              'grid h-4 w-4 shrink-0 place-items-center rounded border transition-all duration-150',
              isTicked
                ? 'border-positive bg-positive text-white'
                : // `border-check`, not `border-edge`: an empty box has nothing
                  // but its outline to be found by, and `--edge` is tuned to
                  // vanish. See the token note in `app/styles/index.css`.
                  'border-check bg-surface-raised/70 hover:border-brand',
              isSyncing && 'cursor-progress',
            )}
          >
            {isTicked && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
          </button>
        )}

        <p
          className={cn(
            'pointer-events-none min-w-0 flex-1 truncate text-center text-3xs font-semibold',
            'uppercase tracking-[0.14em]',
            // Keeps the label on the card's centre line rather than on the
            // centre of whatever is left after the box. Mirrored on the right
            // by the sign-off counter, when there is one.
            onToggleComplete && 'pl-1',
          )}
        >
          {task.isLate ? t('views.late') : t(TASK_STATUS_META[task.status].label)}
        </p>

        {/*
          "1/3", on shared work only.

          The obvious question a per-person tick box raises is "I ticked mine,
          so why is this still open" — and on a task with one assignee it never
          comes up, so the counter would be noise on most cards. It appears
          exactly where the answer is needed.
        */}
        {isShared ? (
          <span
            title={t('groups.signOff', {
              done: String(task.signOff.done),
              total: String(task.signOff.total),
            })}
            className="shrink-0 pl-1 text-4xs font-semibold tabular-nums opacity-70"
          >
            {task.signOff.done}/{task.signOff.total}
          </span>
        ) : (
          // Balances the box so the label's centre is the card's centre.
          onToggleComplete && <span aria-hidden className="h-4 w-4 shrink-0" />
        )}
      </div>

      <div className="space-y-2 p-2.5">
        <h4
          className={cn(
            'line-clamp-2 break-words text-[0.8125rem] font-semibold leading-snug',
            isDone && 'text-content-muted line-through',
          )}
        >
          {task.title}
        </h4>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-3xs text-content-faint">
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
