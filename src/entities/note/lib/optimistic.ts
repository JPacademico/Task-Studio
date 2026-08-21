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
