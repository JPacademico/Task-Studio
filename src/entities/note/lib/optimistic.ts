import { uid } from '@/shared/lib/uid';
import { NOTE_COLORS } from '@/shared/config/constants';
import type { CreateNotePayload, Note } from '../model/types';

/**
 * Objects that exist only in this tab's cache, and how to tell. A placeholder has no row behind it,
 * so every handler that would write to the server has to let it pass.
 */
const PENDING_PREFIX = 'pending-';

export const isPendingNoteId = (id: string): boolean => id.startsWith(PENDING_PREFIX);

// `uid()` rather than `crypto.randomUUID()`: the latter is gated on a secure context.
export const pendingImageId = (): string => `${PENDING_PREFIX}image-${uid()}`;
export const pendingNoteId = (): string => `${PENDING_PREFIX}note-${uid()}`;

/**
 * A create request, plus the one thing only the caller can know. `replacesId` is not sent to the
 * API — `splitCreateRequest` takes it off first.
 */
export interface CreateNoteRequest extends CreateNotePayload {
  /** Id of a placeholder the caller already put on the board. */
  replacesId?: string;
}

/** Separates the wire payload from the client-only hint. */
export const splitCreateRequest = ({
  replacesId,
  ...payload
}: CreateNoteRequest): { payload: CreateNotePayload; replacesId?: string } => ({
  payload,
  replacesId,
});

interface PlaceholderContext {
  id: string;
  /** Whose sheet this is — drives the author stamp and the edit/delete rights. */
  userId: string | undefined;
  scope: Note['scope'];
  projectId?: string | null;
  pageIndex?: number;
}

/**
 * The note the board draws while the server is still hearing about it. Everything the API is going
 * to derive is derived the same way here, so the swap when the real row lands is invisible.
 */
export const optimisticNote = (
  payload: CreateNotePayload,
  { id, userId, scope, projectId = null, pageIndex = 0 }: PlaceholderContext,
): Note => {
  const now = new Date().toISOString();

  return {
    id,
    // Stable for the life of the sheet, even once `id` becomes the server's.
    // See `Note.clientKey` and `adoptServerNote`.
    clientKey: id,
    title: payload.title ?? null,
    content: payload.content ?? '',
    color: payload.color ?? NOTE_COLORS[0],
    scope,
    kind: payload.kind ?? 'TEXT',
    imageKey: null,
    imageUrl: null,
    // A fresh note is never a ticked step, and only a task note can be one at
    // all — the boards this placeholder serves draw no checkbox.
    isCompleted: false,
    completedAt: null,
    positionX: payload.positionX ?? 0,
    positionY: payload.positionY ?? 0,
    width: payload.width ?? 220,
    height: payload.height ?? 220,
    rotation: payload.rotation ?? 0,
    // The server assigns the real stacking order; until it answers the sheet sits at the bottom of
    // the pile, which for a note dropped into empty space.
    zIndex: 0,
    pageIndex: payload.pageIndex ?? pageIndex,
    groupId: payload.groupId ?? null,
    isPinned: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    userId: userId ?? '',
    taskId: payload.taskId ?? null,
    projectId: payload.projectId ?? projectId,
  };
};

/** The server's row, taking the place of the sheet already on the wall. */
export const adoptServerNote = (local: Note | undefined, server: Note): Note => {
  if (!local) return server;

  return {
    ...server,
    clientKey: local.clientKey ?? local.id,
    positionX: local.positionX,
    positionY: local.positionY,
    width: local.width,
    height: local.height,
  };
};

/**
 * Whether the sheet moved or was resized while the create was in flight. If it did, the server is
 * holding the wrong geometry and has to be told — the adoption above only fixes what is on screen.
 */
export const geometryDiffers = (local: Note, server: Note): boolean =>
  Math.abs(local.positionX - server.positionX) > 1 ||
  Math.abs(local.positionY - server.positionY) > 1 ||
  Math.abs(local.width - server.width) > 1 ||
  Math.abs(local.height - server.height) > 1;
