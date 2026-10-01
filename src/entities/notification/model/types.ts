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
  | 'AI_SUGGESTION'
  /** Somebody opened or scheduled a live room you are expected at. */
  | 'LIVE_ROOM_INVITE';

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
 * The deep-link hints and the few structured values a row renders. Everything here is optional and
 * everything is untrusted: the column is free-form JSON on the API.
 */
export interface NotificationPayload {
  projectId?: string;
  taskId?: string;
  invitationId?: string;
  /** Set on an organization invitation; see the bell's `deepLink`. */
  organizationId?: string;
  /**
   * The deadline behind a due-soon alert, as an ISO instant. Carried here rather than written into
   * `body`.
   */
  dueAt?: string | null;
  /**
   * Which feature wrote this row. Only the newer writers set it, and only where the ids alone are
   * ambiguous.
   */
  kind?: string;
  /** The live room this announces. See `kind`. */
  roomId?: string;
  /** When that room opens, as an ISO instant. Rendered by the reader's browser. */
  opensAt?: string | null;
}
