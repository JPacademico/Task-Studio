import type { UserSummary } from '@/entities/user/model/types';

/**
 * How far a message *we* sent has got. Client-only — never sent by the API.
 *
 * Absent means settled: either it came from the server, or the server has
 * acknowledged ours. The two named states are the ones worth drawing.
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
   * Correlates our optimistic copy with the server's broadcast of it.
   *
   * We generate it, the gateway echoes it back on both the ack and the
   * `chat:message` fan-out, and the sender uses it to recognise its own message
   * arriving and replace the local copy instead of drawing a second one.
   */
  clientId?: string;
  /** @see ChatDelivery — set on our own optimistic copies only. */
  delivery?: ChatDelivery;
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
