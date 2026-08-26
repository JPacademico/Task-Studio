import type { TaskPriority, TaskStatus, TaskType } from '@/entities/task/model/types';
import type { UserSummary } from '@/entities/user/model/types';

/**
 * One column on a project's grouping board.
 *
 * A label the project invents for itself — "Prospect", "Wireframe", "Back end"
 * — and **not** a workflow state. `TaskStatus` already owns that question with
 * the same three answers on every project in the system, and it is what the
 * main board's columns are. This board draws the status as a badge on the card
 * instead, which is what makes it safe to show both at once: dragging here
 * changes only the group, so no gesture on this board can mark work done.
 */
export interface TaskGroup {
  id: string;
  name: string;
  color: string;
  order: number;
}

/** Just enough of a task to draw it as a card on the grouping board. */
export interface GroupedTask {
  id: string;
  title: string;
  color: string;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  dueAt: string | null;
  completedAt: string | null;
  groupId: string | null;
  /** Past the deadline and still open — the card draws it in red. */
  isLate: boolean;
  /**
   * Assigned to the reader, which is what makes the card's tick box theirs.
   *
   * Answered by the server rather than derived from a comparison against the
   * session here, for the same reason `canManage` is: who owns a completion is
   * an authorisation rule, and a client that re-derived it would be a second
   * copy of that rule to keep in step.
   */
  isMine: boolean;
  /** …and whether they have already ticked it. */
  isCompletedByMe: boolean;
  /**
   * How many assignees have signed off, out of how many there are.
   *
   * The board's tick box only ever ticks the reader's own row, so on a shared
   * task this is what answers "I ticked mine, why is it still open" — and it is
   * what lets the optimistic patch predict the status correctly, since a tick
   * completes the task only when it is the last one outstanding.
   */
  signOff: { done: number; total: number };
  assignees: UserSummary[];
}

export interface TaskGroupColumn extends TaskGroup {
  tasks: GroupedTask[];
}

export interface TaskGroupBoard {
  projectId: string;
  /**
   * Whether this reader may add, rename, reorder or delete columns.
   *
   * Answered by the server rather than re-derived from `myRole` here, for the
   * same reason a document answers `canEdit`: a client that worked it out for
   * itself would be a second implementation of an authorisation decision.
   */
  canManage: boolean;
  groups: TaskGroupColumn[];
  /**
   * Tasks with no column, and the only lane that is not a row in the database.
   *
   * Sent separately from `groups` because it is not a place a task can be
   * *filed* — it is where a task is when it has not been. The board hides the
   * lane entirely when this is empty, which is the whole reason it is its own
   * field rather than a pseudo-column with an id.
   */
  untagged: GroupedTask[];
}

export interface CreateTaskGroupPayload {
  name: string;
  color?: string;
}

export interface UpdateTaskGroupPayload {
  name?: string;
  color?: string;
}
