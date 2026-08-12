import type { UserSummary } from '@/entities/user/model/types';

export interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  projectId: string;
  userId: string;
  user: UserSummary;
  /** Present only on the optimistic echo of a message we just sent. */
  clientId?: string;
}

export type WhiteboardElementType = 'STROKE' | 'TEXT' | 'STICKY' | 'SHAPE' | 'IMAGE';

export interface WhiteboardStrokeData {
  points: [number, number][];
  color: string;
  width: number;
}

export interface WhiteboardElement {
  id: string;
  type: WhiteboardElementType;
  data: WhiteboardStrokeData | Record<string, unknown>;
  projectId: string;
  createdById: string;
  createdAt: string;
  deletedAt: string | null;
}
