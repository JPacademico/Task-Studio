export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_COMPLETED'
  | 'TASK_DUE_SOON'
  | 'TASK_OVERDUE'
  | 'PROJECT_INVITE'
  | 'PROJECT_INVITE_ACCEPTED'
  /** An invitation to join a company, and the reply the inviter gets back. */
  | 'ORG_INVITE'
  | 'ORG_INVITE_ACCEPTED'
  | 'CHAT_MENTION'
  | 'AI_SUGGESTION';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  payload: NotificationPayload | null;
  readAt: string | null;
  createdAt: string;
}

/**
 * The deep-link hints and the few structured values a row renders.
 *
 * Everything here is optional and everything is untrusted: the column is
 * free-form JSON on the API, rows written by older builds are still in the
 * table, and a client several versions behind the server will meet keys it has
 * never heard of. So this is a description of what *may* be there, not a
 * contract — every reader has to cope with each field being absent.
 */
export interface NotificationPayload {
  projectId?: string;
  taskId?: string;
  invitationId?: string;
  /** Set on an organization invitation; see the bell's `deepLink`. */
  organizationId?: string;
  /**
   * The deadline behind a due-soon alert, as an ISO instant.
   *
   * Carried here rather than written into `body` because a deadline is a point
   * in time and only the reader's own browser knows how to render one — which
   * timezone they are in, and which language the date should be in. The API
   * used to format it into the body itself and produced
   * `Deadline 2026-08-21T20:00:00.000Z`, which was UTC and unreadable in equal
   * measure.
   */
  dueAt?: string | null;
}
