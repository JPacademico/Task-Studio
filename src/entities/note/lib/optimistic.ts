import { NOTE_COLORS } from '@/shared/config/constants';
import type { CreateNotePayload, Note } from '../model/types';

/**
 * Objects that exist only in this tab's cache, and how to tell.
 *
 * A placeholder has no row behind it, so every handler that would write to the
 * server has to let it pass — a `PATCH /notes/pending-…` is a guaranteed 404
 * and an error toast for what looks, to the user, like picking up a note they
 * can see. The prefix is the whole mechanism: it cannot collide with a uuid,
 * and it needs no second list to be kept in step.
 *
 * Two flavours share it. An *image* placeholder stands in for a file that is
 * still uploading and can live for several seconds; a *note* placeholder stands
 * in for a create request already in flight and is usually replaced within a
 * couple of hundred milliseconds. Both are unwritable while they last, which is
 * the only thing the rest of the app needs to know — hence one predicate.
 */
const PENDING_PREFIX = 'pending-';

export const isPendingNoteId = (id: string): boolean => id.startsWith(PENDING_PREFIX);

export const pendingImageId = (): string => `${PENDING_PREFIX}image-${crypto.randomUUID()}`;
export const pendingNoteId = (): string => `${PENDING_PREFIX}note-${crypto.randomUUID()}`;

/**
 * A create request, plus the one thing only the caller can know.
 *
 * `replacesId` is not sent to the API — `splitCreateRequest` takes it off
 * first, and it has to, because the validation pipe rejects any property it
 * does not recognise. It exists so a caller that has *already* drawn something
 * on the wall (an image being uploaded, say) can tell the mutation to adopt
 * that sheet rather than draw a second one beside it.
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
 * The note the board draws while the server is still hearing about it.
 *
 * Everything the API is going to derive is derived the same way here, so the
 * swap when the real row lands is invisible: same colour, same position, same
 * rotation, same box. The fields the server owns outright — timestamps, the
 * resolved image URL — are given honest local values rather than being left
 * undefined, because the card renders them and `undefined` is what turns a
 * Post-it into a hole in the wall for one frame.
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
    positionX: payload.positionX ?? 0,
    positionY: payload.positionY ?? 0,
    width: payload.width ?? 220,
    height: payload.height ?? 220,
    rotation: payload.rotation ?? 0,
    // The server assigns the real stacking order; until it answers the sheet
    // sits at the bottom of the pile, which for a note dropped into empty space
    // — where the caller put it — is indistinguishable from the top.
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

/**
 * The server's row, taking the place of the sheet already on the wall.
 *
 * Two things have to survive the swap, and neither is obvious until you watch
 * somebody drop a note and immediately drag it.
 *
 * **The element.** React keys the wall by note id, so replacing a `pending-…`
 * id with a uuid unmounts one component and mounts another. Framer Motion's
 * drag lives on that element — its pointer capture, its motion values, its
 * gesture state — so the swap ended the drag mid-gesture and the sheet fell
 * back to where it was dropped. Carrying `clientKey` across means the key never
 * changes and the element is never replaced.
 *
 * **The position.** The server answers with the note as it was *posted*, which
 * is one round trip behind a sheet the user has been moving ever since. So
 * anything the user can have changed in that window is taken from the local
 * copy rather than the response — the same principle `mergeRemoteNote` applies
 * to a socket echo, for the same reason, at a different moment.
 *
 * `local` is the placeholder as the cache holds it *now*, not as it was
 * created. That distinction is the whole point: it is where the drag has got to.
 */
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
 * Whether the sheet moved or was resized while the create was in flight.
 *
 * If it did, the server is holding the wrong geometry and has to be told — the
 * adoption above only fixes what is on screen. Compared with a tolerance of one
 * pixel because these are floats that have been through a drag, and a write per
 * sub-pixel of rounding noise is a request for nothing.
 */
export const geometryDiffers = (local: Note, server: Note): boolean =>
  Math.abs(local.positionX - server.positionX) > 1 ||
  Math.abs(local.positionY - server.positionY) > 1 ||
  Math.abs(local.width - server.width) > 1 ||
  Math.abs(local.height - server.height) > 1;
