import type { TaskPriority, TaskStatus, TaskType } from '@/entities/task/model/types';
import type { UserSummary } from '@/entities/user/model/types';

/**
 * One column on a project's grouping board. A label the project invents for itself — "Prospect",
 * "Wireframe", "Back end" — and **not** a workflow state.
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
   * Assigned to the reader, which is what makes the card's tick box theirs. Answered by the server
   * rather than derived from a comparison against the session here.
   */
  isMine: boolean;
  /** …and whether they have already ticked it. */
  isCompletedByMe: boolean;
  /**
   * How many assignees have signed off, out of how many there are. The board's tick box only ever
   * ticks the reader's own row, so on a shared task this is what answers "I ticked mine.
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
   * Whether this reader may add, rename, reorder or delete columns. Answered by the server rather
   * than re-derived from `myRole` here, for the same reason a document answers `canEdit`.
   */
  canManage: boolean;
  groups: TaskGroupColumn[];
  /**
   * Tasks with no column, and the only lane that is not a row in the database. Sent separately from
   * `groups` because it is not a place a task can be *filed*.
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
