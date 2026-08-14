import type { OverviewDelta } from '@/entities/project/model/types';
import type { Task } from '../model/types';

/**
 * What one task change does to the home dashboard's three counters.
 *
 * The API counts *assignment rows belonging to the caller* — see
 * `DashboardService.forUser` — and the three definitions are not the same
 * question asked three ways:
 *
 *   - **open**: my assignment on a task whose status is not COMPLETED. Note
 *     this ignores my own tick entirely: on a shared task I have finished but
 *     my colleague has not, the work is still open.
 *   - **completed**: my assignment carries a `completedAt`. That is my tick,
 *     regardless of what the task as a whole is doing.
 *   - **overdue**: my assignment is untucked, the task is not COMPLETED, and
 *     the deadline is behind us.
 *
 * Getting this subtly wrong would be worse than the lag it exists to remove —
 * a counter that jumps to the right number and then corrects itself a second
 * later is a counter nobody trusts again. So each of the three is written out
 * as the predicate the server applies, evaluated before and after, and the
 * delta is the difference. Nothing is inferred from the action that caused it.
 */

const isOpenForMe = (task: Task): number =>
  task.isMine && task.status !== 'COMPLETED' ? 1 : 0;

const isCompletedForMe = (task: Task): number => (task.isMine && task.isCompletedByMe ? 1 : 0);

const isOverdueForMe = (task: Task, now: number): number =>
  task.isMine &&
  !task.isCompletedByMe &&
  task.status !== 'COMPLETED' &&
  task.dueAt !== null &&
  Date.parse(task.dueAt) < now
    ? 1
    : 0;

/**
 * The counter movement between two states of the same task.
 *
 * `now` is a parameter so that both sides are measured against one instant.
 * Reading the clock twice inside a single comparison is how a task due in the
 * next millisecond ends up counted as both overdue and not.
 */
export const overviewDeltaFor = (
  before: Task | undefined,
  after: Task | undefined,
  now: number = Date.now(),
): OverviewDelta => {
  if (!before || !after) return {};

  return {
    openTasks: isOpenForMe(after) - isOpenForMe(before),
    completedTasks: isCompletedForMe(after) - isCompletedForMe(before),
    overdueTasks: isOverdueForMe(after, now) - isOverdueForMe(before, now),
  };
};
