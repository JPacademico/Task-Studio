import type { AttachedFile, UserSummary } from '@/entities/user/model/types';

export type TaskType = 'MEGA' | 'MICRO' | 'MULTI' | 'STANDARD';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
/** No `team`: the tab that meant "everyone but me" was removed — see `TaskFilters`. */
export type TaskScope = 'mine' | 'all';
export type TaskLateness = 'LATE' | 'COMPLETED_LATE' | 'ON_TIME';

/**
 * One step on a task's note checklist: a Post-it that can be ticked off.
 *
 * Replaces `ChecklistItem`, which was the same list drawn twice — a column of
 * plain rows next to a wall of notes, neither of which could see the other. The
 * merge kept the note, because a note already carried the two things a
 * checklist row could not: a colour, and an author.
 *
 * `author` and `completedBy` are different people far more often than not, and
 * that is the point on a shared task — whoever wrote the step down is rarely
 * whoever finished it.
 */
export interface TaskNote {
  id: string;
  content: string;
  color: string;
  isCompleted: boolean;
  completedAt: string | null;
  completedBy: UserSummary | null;
  createdAt: string;
  /** The author's id, for the "may I edit this" check on the sheet. */
  userId: string;
  author: UserSummary;
}

export interface TaskAssignee extends UserSummary {
  completedAt: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  color: string;
  startAt: string | null;
  dueAt: string | null;
  completedAt: string | null;
  attachmentUrl: string | null;
  /**
   * Small rendition of the attachment, drawn inline on the task sheet.
   *
   * Null for anything uploaded before thumbnails existed; the sheet falls back
   * to `attachmentUrl` in that case. See `ZoomableImage`.
   */
  attachmentThumbUrl: string | null;
  /**
   * The attached document, if there is one.
   *
   * Separate from `attachmentUrl` because the two are read in completely
   * different ways: a picture is drawn on the sheet, a document is something
   * you take away and open in another application.
   */
  file: AttachedFile | null;
  order: number;
  deletedAt: string | null;
  /** Set when the 7-day housekeeping sweep binned it, not a person. */
  autoArchivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /**
   * `null` on a personal task — work with no project behind it, which lives
   * only on its owner's task menu. Every surface that links back to a board
   * has to check this before drawing the link.
   */
  /**
   * The project this belongs to, or `null` for a personal task.
   *
   * `endsAt` rides along with the name and the colour, and earns its place: it
   * is the ceiling every deadline on this task is checked against, so the
   * composer can bound its own date picker instead of discovering the rule by
   * being refused. Null when the project has no finish date, which is most of
   * them.
   */
  project: { id: string; name: string; color: string; endsAt: string | null } | null;
  createdBy: UserSummary;
  assignees: TaskAssignee[];
  isMine: boolean;
  isCompletedByMe: boolean;
  isPinned: boolean;
  isOverdue: boolean;
  /** Past the deadline and still open. */
  isLate: boolean;
  /** Finished, but after the deadline. */
  isCompletedLate: boolean;
  /**
   * Which column this sits in on the project's grouping board, or `null`.
   *
   * Spelled out rather than sent as an id, because every surface that draws
   * the tag draws a coloured chip with a name on it — see the API's
   * `taskInclude`.
   */
  group: TaskGroupRef | null;
  /** The note checklist, whole. Capped at `MAX_TASK_NOTES` by the API. */
  notes: TaskNote[];
  /** How many of those steps are ticked. */
  noteProgress: { done: number; total: number };
  /** Distinct authors, for the faces on a card's note marker. */
  noteAuthors: UserSummary[];
}

/** A grouping-board column, as a task carries it. */
export interface TaskGroupRef {
  id: string;
  name: string;
  color: string;
}

export interface ListTasksParams {
  projectId?: string;
  scope?: TaskScope;
  status?: TaskStatus;
  type?: TaskType;
  priority?: TaskPriority;
  pinnedOnly?: boolean;
  /** Only tasks somebody has attached a note to. */
  hasNotes?: boolean;
  /** Only the caller's own tasks that have no project behind them. */
  personalOnly?: boolean;
  /** Drops completed work unless an explicit status filter asks for it. */
  hideCompleted?: boolean;
  lateness?: TaskLateness;
  from?: string;
  to?: string;
  search?: string;
  limit?: number;
}

export interface TaskAgenda {
  days: { date: string; tasks: Task[] }[];
  unscheduled: Task[];
}

export interface CreateTaskPayload {
  /** Omitted for a personal task: no project, no roster, no fan-out. */
  projectId?: string;
  title: string;
  description?: string;
  color?: string;
  priority?: TaskPriority;
  startAt?: string;
  dueAt?: string;
  assigneeIds?: string[];
  /**
   * Project teams to assign wholesale, merged into `assigneeIds` by the API.
   *
   * Create only. Editing a task edits the people on it — a team was a way of
   * naming them once, and re-expanding it later would silently re-add somebody
   * who had been taken off. See the API's `TeamsService`.
   */
  teamIds?: string[];
  /**
   * Starting steps for the note checklist, as plain lines.
   *
   * Still `checklist` on the wire: the composer sends a list of steps, which is
   * what it has always meant, and the API turns them into Post-its. Capped at
   * three by `MAX_TASK_NOTES`.
   */
  checklist?: string[];
  /** Which grouping-board column to file it under. Projects only. */
  groupId?: string;
  attachmentKey?: string;
  attachmentThumbKey?: string;
  /** The uploaded document to pin to it — key, filename and size. */
  file?: { key: string; name: string; size: number };
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  color?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  startAt?: string | null;
  dueAt?: string | null;
  assigneeIds?: string[];
  attachmentKey?: string | null;
  attachmentThumbKey?: string | null;
  /**
   * Three states, like `attachmentKey`: an object attaches or replaces, `null`
   * detaches, and leaving it out keeps whatever is already there.
   */
  file?: { key: string; name: string; size: number } | null;
  order?: number;
  /**
   * Three states, like `file`: an id files the task under a column, `null`
   * untags it back into the grouping board's dynamic lane, and omitting the
   * field leaves the tag alone.
   */
  groupId?: string | null;
}
