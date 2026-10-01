import type { UserSummary } from '@/entities/user/model/types';

/**
 * What one line of a project's changelog says happened. Mirrors the API's `ActivityType` enum
 * exactly.
 */
export type ActivityType =
  | 'PROJECT_CREATED'
  | 'PROJECT_IMPORTED'
  | 'PROJECT_RENAMED'
  | 'PROJECT_COMPLETED'
  | 'PROJECT_REOPENED'
  | 'PROJECT_FILED'
  | 'PROJECT_UNFILED'
  | 'PROJECT_SYNCED'
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
  | 'MEETING_SCHEDULED'
  /**
   * Somebody undid one of the lines above. A *new* entry rather than the removal of the old one,
   * because a changelog that can erase itself is not one.
   */
  | 'ACTION_REVERTED';

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  createdAt: string;
  /**
   * The person, if their account still exists. Null for a deleted account and for anything a
   * scheduler did on nobody's behalf.
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
  /** Whether *this reader* may undo this line — decided by the API, not guessed. */
  canRevert: boolean;
  /** Set once somebody has undone it. The line stays, struck through. */
  revertedAt: string | null;
  revertedBy: UserSummary | null;
}

export interface ActivityPage {
  items: ActivityEntry[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * What undoing a line answers with. `message` is written by the API and is deliberately specific —
 * "Ship the billing page was restored", "Ana is an admin again".
 */
export interface RevertResult {
  activityId: string;
  reverted: boolean;
  type: ActivityType;
  message: string;
}
