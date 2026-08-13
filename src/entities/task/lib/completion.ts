import type { Task, TaskAssignee } from '../model/types';

/**
 * Who is allowed to call a shared task finished.
 *
 * A task with one assignee is that person's to close. A task with several is
 * the team's, and one member deciding it is done on everybody's behalf is the
 * thing this file exists to stop: the API completes *every* outstanding
 * assignment when a status flips to COMPLETED, so a single drag used to tick
 * three people's boxes for them.
 *
 * The rule, matching the API exactly:
 *
 *   - Every assignee ticks their own box (`isCompletedByMe`). When the last
 *     one does, the task completes itself.
 *   - Dragging the card into Completed is only allowed once everybody *else*
 *     has ticked theirs — the drag then stands for the dragger's own tick.
 *   - A project owner or admin may close it regardless. Somebody has to be
 *     able to finish work the person who left the company was assigned to.
 */

/** Carried by more than one person, which is where the rule starts to apply. */
export const isSharedTask = (task: Task): boolean => task.assignees.length > 1;

/** The assignees who still have their own box unticked. */
export const outstandingAssignees = (task: Task): TaskAssignee[] =>
  task.assignees.filter((assignee) => assignee.completedAt === null);

/**
 * How many people other than the caller are still outstanding.
 *
 * Deliberately derived from `isMine` / `isCompletedByMe` rather than from a
 * user id: those two flags are computed server-side for the caller, so no
 * surface has to know who is signed in to ask the question — and there is no
 * second copy of "which of these assignees is me" to get wrong.
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
 * Why not — phrased for a tooltip and for the toast a rejected drop raises.
 *
 * Names the people rather than counting them: "waiting on Ana and Tom" is
 * actionable in a way "waiting on 2 assignees" is not. Caps at three names so
 * a task shared across a whole roster still produces a sentence.
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
      ? `${blockingAssigneeCount(task)} more assignee(s)`
      : listed.length === 1
        ? listed[0]
        : `${listed.slice(0, -1).join(', ')} and ${listed[listed.length - 1]}`;

  const more = names.length > listed.length ? ` and ${names.length - listed.length} more` : '';

  return `Shared task — still waiting on ${people}${more}. Everyone assigned has to tick their own box, or a project admin can close it.`;
};
