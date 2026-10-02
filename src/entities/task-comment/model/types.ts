import type { TaskStatus } from '@/entities/task/model/types';
import type { UserSummary } from '@/entities/user/model/types';

/** Client-only, on our own optimistic copies. Absent means the server has it. */
export type CommentDelivery = 'pending' | 'failed';

/** One message on a task's comment thread. */
export interface TaskComment {
  id: string;
  content: string;
  createdAt: string;
  editedAt: string | null;
  taskId: string;
  userId: string;
  user: UserSummary;
  /** The sender's own id for the comment; matches an optimistic copy to the server's. */
  clientId?: string | null;
  /** Set on comments pulled from a synced Trello or Jira board. */
  externalSource?: 'TRELLO' | 'JIRA' | null;
  /** The source author's name, when nobody on the roster wrote it. */
  externalAuthor?: string | null;
  /** Present on realtime events and create responses. */
  projectId?: string;
  delivery?: CommentDelivery;
}

/** One row of the thread list: a task with comments, and how much of it is new to me. */
export interface TaskThread {
  taskId: string;
  projectId: string;
  title: string;
  color: string;
  status: TaskStatus;
  total: number;
  unread: number;
  lastCommentAt: string;
  preview: { author: string; content: string } | null;
}
