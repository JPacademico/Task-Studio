import { Skeleton } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';

/**
 * The tasks this client cannot know about yet. A board is now drawn immediately from whatever the
 * app already had — see `seedTasksFor`.
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
