import { translate } from '@/shared/i18n';
import type { Task, TaskAssignee } from '../model/types';

/**
 * Who is allowed to call a shared task finished. A task with one assignee is that person's to
 * close.
 */

/** Carried by more than one person, which is where the rule starts to apply. */
export const isSharedTask = (task: Task): boolean => task.assignees.length > 1;

/** The assignees who still have their own box unticked. */
export const outstandingAssignees = (task: Task): TaskAssignee[] =>
  task.assignees.filter((assignee) => assignee.completedAt === null);

/**
 * How many people other than the caller are still outstanding. Deliberately derived from `isMine` /
 * `isCompletedByMe` rather than from a user id.
 */
export const blockingAssigneeCount = (task: Task): number => {
  const outstanding = outstandingAssignees(task).length;

  // If the task is mine and I have not ticked my box, exactly one of those
  // outstanding assignees is me — and me dragging the card *is* that tick.
  return task.isMine && !task.isCompletedByMe ? outstanding - 1 : outstanding;
};

/** How many assignees have signed off, for the "2/3 done" read-out on a card. */
export const completionProgress = (task: Task): { done: number; total: number } => ({
  done: task.assignees.length - outstandingAssignees(task).length,
  total: task.assignees.length,
});

export interface CompletionContext {
  /** Owner or admin on the project this task belongs to. */
  isAdmin?: boolean;
  /** Only ever used to leave the caller out of the "waiting on…" list. */
  currentUserId?: string;
}

/** May this user move the card into Completed right now? */
export const canCompleteTask = (task: Task, context: CompletionContext = {}): boolean =>
  Boolean(context.isAdmin) || blockingAssigneeCount(task) <= 0;

/**
 * Why not — phrased for a tooltip and for the toast a rejected drop raises. Names the people rather
 * than counting them.
 */
export const completionBlockedReason = (
  task: Task,
  context: CompletionContext = {},
): string | null => {
  if (canCompleteTask(task, context)) return null;

  const names = outstandingAssignees(task)
    .filter((assignee) => assignee.id !== context.currentUserId)
    .map((assignee) => assignee.displayName);

  const listed = names.slice(0, 3);
  const people =
    listed.length === 0
      ? translate('task.sharedBlockedCount', { count: String(blockingAssigneeCount(task)) })
      : listed.length === 1
        ? listed[0]
        : translate('task.listJoin', {
            list: listed.slice(0, -1).join(', '),
            last: listed[listed.length - 1],
          });

  const more =
    names.length > listed.length
      ? translate('task.andMore', { count: String(names.length - listed.length) })
      : '';

  return translate('task.sharedBlocked', { people: `${people}${more}` });
};
