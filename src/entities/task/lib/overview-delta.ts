import type { OverviewDelta } from '@/entities/project/model/types';
import type { Task } from '../model/types';

/** What one task change does to the home dashboard's three counters. */

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
 * The counter movement between two states of the same task. `now` is a parameter so that both sides
 * are measured against one instant.
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
