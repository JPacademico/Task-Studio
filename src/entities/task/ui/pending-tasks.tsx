import { Skeleton } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';

/**
 * The tasks this client cannot know about yet.
 *
 * A board is now drawn immediately from whatever the app already had — see
 * `seedTasksFor` — and on a project board that head start is, by construction,
 * only the current user's own work: the dashboard never fetched anybody else's.
 * So the first paint is real but short, and the rest of the roster's tasks
 * arrive a round trip later.
 *
 * Without something here that reads as "more coming", the short list is
 * indistinguishable from a complete one, and a board that silently grows after
 * you have started reading it is worse than a board that made you wait. These
 * placeholders are the difference between an incomplete answer and a wrong one.
 *
 * Capped at three regardless of how many are actually missing, because the
 * count is not knowable — the point is to say "not finished", not to predict a
 * number, and a screenful of grey would overstate it.
 *
 * Used by the flat layouts only — the list, the sprint and the calendar, which
 * have nowhere else to put this. The *board* draws its own placeholders inside
 * its columns instead: see `TaskBoard.pendingPerColumn`, and the note there for
 * why a strip of grey beneath three columns was the wrong shape.
 */
const MAX_PLACEHOLDERS = 3;

interface PendingTasksProps {
  /** How many to draw, clamped to three. */
  count?: number;
  /** Matches the dense card the list and sprint layouts use. */
  compact?: boolean;
  className?: string;
}

export const PendingTasks = ({ count = MAX_PLACEHOLDERS, compact, className }: PendingTasksProps) => {
  const total = Math.max(0, Math.min(MAX_PLACEHOLDERS, count));
  if (total === 0) return null;

  return (
    <div
      aria-hidden
      className={cn('grid gap-2.5 lg:grid-cols-2', className)}
      data-testid="pending-tasks"
    >
      {Array.from({ length: total }, (_, index) => (
        <Skeleton key={index} className={cn('rounded-2xl', compact ? 'h-[4rem]' : 'h-[6.5rem]')} />
      ))}
    </div>
  );
};
