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
  /**
   * This stroke takes ink away instead of laying it down.
   *
   * An eraser used to be stored as an opaque black stroke, which is only an
   * eraser on a canvas that happens to be black — on every skin the app
   * actually ships it drew a thick black line. The flag rides along in the
   * element's JSON (the API stores stroke data verbatim), so peers and page
   * reloads erase the same way the person drawing it did.
   */
  erase?: boolean;
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
