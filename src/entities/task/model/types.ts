import type { UserSummary } from '@/entities/user/model/types';

export type TaskType = 'MEGA' | 'MICRO' | 'MULTI' | 'STANDARD';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type TaskScope = 'mine' | 'team' | 'all';
export type TaskLateness = 'LATE' | 'COMPLETED_LATE' | 'ON_TIME';

export interface ChecklistItem {
  id: string;
  content: string;
  isCompleted: boolean;
  completedAt: string | null;
  order: number;
  taskId: string;
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
  project: { id: string; name: string; color: string } | null;
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
  checklist: ChecklistItem[];
  checklistProgress: { done: number; total: number };
  noteCount: number;
  /** Roster members who attached a note to this task. */
  noteAuthors: UserSummary[];
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
  checklist?: string[];
  attachmentKey?: string;
  attachmentThumbKey?: string;
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
  order?: number;
}
