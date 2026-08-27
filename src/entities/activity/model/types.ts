import type { UserSummary } from '@/entities/user/model/types';

/**
 * What one line of a project's changelog says happened.
 *
 * Mirrors the API's `ActivityType` enum exactly. A union of literals rather
 * than a TypeScript `enum` for the same reason every other domain here uses
 * one: the values arrive as strings over JSON, and a union describes that
 * without asking the bundler to ship a runtime object for it.
 *
 * The list is closed on purpose — see the enum's note on the API. The API
 * stores *what happened*; the sentence is written on this side, in whichever
 * language the reader has chosen, which is only possible while the wire format
 * stays a symbol rather than a sentence.
 */
export type ActivityType =
  | 'PROJECT_CREATED'
  | 'PROJECT_IMPORTED'
  | 'PROJECT_RENAMED'
  | 'PROJECT_COMPLETED'
  | 'PROJECT_REOPENED'
  | 'PROJECT_FILED'
  | 'PROJECT_UNFILED'
  | 'MEMBER_INVITED'
  | 'MEMBER_JOINED'
  | 'MEMBER_LEFT'
  | 'MEMBER_REMOVED'
  | 'MEMBER_ROLE_CHANGED'
  | 'TASK_CREATED'
  | 'TASK_COMPLETED'
  | 'TASK_REOPENED'
  | 'TASK_DELETED'
  | 'DOCUMENT_CREATED'
  | 'DOCUMENT_IMPORTED'
  | 'DOCUMENT_CONVERTED'
  | 'DOCUMENT_DELETED'
  | 'MEETING_SCHEDULED';

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  createdAt: string;
  /**
   * The person, if their account still exists.
   *
   * Null for a deleted account and for anything a scheduler did on nobody's
   * behalf — `actorName` is the snapshot that keeps the line readable in the
   * first case, and there is simply nobody to name in the second.
   */
  actor: UserSummary | null;
  /** What the actor was called when this happened. */
  actorName: string | null;
  /** The thing acted upon, named: a task title, a page title, a project. */
  subject: string | null;
  /** A second person or place, when the line has one. */
  targetName: string | null;
  /** Small structured extras — a role, a count, a date. */
  meta: Record<string, unknown> | null;
}

export interface ActivityPage {
  items: ActivityEntry[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
