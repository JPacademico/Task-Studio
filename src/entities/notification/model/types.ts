export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_COMPLETED'
  | 'TASK_DUE_SOON'
  | 'TASK_OVERDUE'
  | 'PROJECT_INVITE'
  | 'PROJECT_INVITE_ACCEPTED'
  | 'CHAT_MENTION'
  | 'AI_SUGGESTION';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  payload: { projectId?: string; taskId?: string; invitationId?: string } | null;
  readAt: string | null;
  createdAt: string;
}
