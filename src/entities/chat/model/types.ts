import type { UserSummary } from '@/entities/user/model/types';

/**
 * How far a message *we* sent has got. Client-only — never sent by the API. Absent means settled:
 * either it came from the server, or the server has acknowledged ours.
 */
export type ChatDelivery = 'pending' | 'failed';

export interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  projectId: string;
  userId: string;
  user: UserSummary;
  /**
   * Correlates our optimistic copy with the server's broadcast of it. We generate it, the gateway
   * echoes it back on both the ack and the `chat:message` fan-out.
   */
  clientId?: string;
  /**
   * Ids of the roster members this message calls out with `@`. Resolved by the composer's picker,
   * narrowed to actual members by the API, and stored with the row.
   */
  mentions?: string[];
  /** @see ChatDelivery — set on our own optimistic copies only. */
  delivery?: ChatDelivery;
}

export type WhiteboardElementType = 'STROKE' | 'TEXT' | 'STICKY' | 'SHAPE' | 'IMAGE';

export interface WhiteboardStrokeData {
  points: [number, number][];
  color: string;
  width: number;
  /**
   * This stroke takes ink away instead of laying it down. An eraser used to be stored as an opaque
   * black stroke, which is only an eraser on a canvas that happens to be black.
   */
  erase?: boolean;
}

export interface WhiteboardElement {
  id: string;
  type: WhiteboardElementType;
  data: WhiteboardStrokeData | Record<string, unknown>;
  projectId: string;
  createdById: string;
  /** Which page of the whiteboard the ink is on. Absent from an older API: page 0. */
  pageIndex?: number;
  createdAt: string;
  deletedAt: string | null;
}
