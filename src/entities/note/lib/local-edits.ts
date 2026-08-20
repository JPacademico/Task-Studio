import type { Note, UpdateNotePayload } from '../model/types';

type EditableField = keyof UpdateNotePayload;

interface PendingEdit {
  fields: Set<EditableField>;
  expiresAt: number;
}

/**
 * Fields this client has written and the server has not confirmed back yet.
 *
 * ## The problem this exists for
 *
 * A project board is a shared surface, so every write fans out over the socket
 * as `note:updated` — to the whole room, *including the person who made it*.
 * The payload is the row as the server has it, which by the time it arrives is
 * one round trip behind whatever has happened locally since. Applied blindly,
 * that echo overwrites the optimistic value with an older one, and the user
 * watches their own edit get undone a moment after making it. On the title
 * field, where a write used to fire per keystroke, it looked like the letters
 * were changing by themselves.
 *
 * ## Why it is per field, not per note
 *
 * Dropping the whole echo would be simpler and would also drop a teammate's
 * concurrent change to a *different* field of the same note — somebody moving a
 * sheet while its author renames it. Recording which fields are in flight lets
 * the incoming row land in full and only the pending ones be kept back, so the
 * two edits compose instead of one winning.
 *
 * ## Why it expires
 *
 * A mutation that never settles — offline, a dropped socket — must not pin a
 * field forever. The TTL is the ceiling on how long a local value can outrank
 * the server's, and it is refreshed on every write, so it only ever elapses
 * once the client has genuinely stopped talking.
 */
const pending = new Map<string, PendingEdit>();

/** Long enough to cover a slow round trip, short enough to self-heal. */
const TTL_MS = 6_000;

/**
 * How long a settled write stays authoritative.
 *
 * The echo of a write does not arrive with the response to it; the two race.
 * Releasing the field the instant the PATCH resolves therefore leaves a window
 * in which its own echo — still older than what is on screen if the user kept
 * typing — is treated as news. A short tail closes it.
 */
const SETTLE_GRACE_MS = 1_200;

const prune = (noteId: string, entry: PendingEdit): PendingEdit | undefined => {
  if (entry.expiresAt > Date.now()) return entry;
  pending.delete(noteId);
  return undefined;
};

/** Records that this client is the authority on `payload`'s fields for now. */
export const markLocalNoteEdit = (noteId: string, payload: UpdateNotePayload): void => {
  const entry = pending.get(noteId);
  const fields = entry ? entry.fields : new Set<EditableField>();

  for (const field of Object.keys(payload) as EditableField[]) fields.add(field);
  pending.set(noteId, { fields, expiresAt: Date.now() + TTL_MS });
};

/** Hands the fields back to the server, after the echo has had time to land. */
export const releaseLocalNoteEdit = (noteId: string, payload: UpdateNotePayload): void => {
  const entry = pending.get(noteId);
  if (!entry) return;

  entry.expiresAt = Math.min(entry.expiresAt, Date.now() + SETTLE_GRACE_MS);

  window.setTimeout(() => {
    const current = pending.get(noteId);
    if (!current || current.expiresAt > Date.now()) return;

    for (const field of Object.keys(payload) as EditableField[]) current.fields.delete(field);
    if (current.fields.size === 0) pending.delete(noteId);
  }, SETTLE_GRACE_MS);
};

/**
 * The incoming row, with anything this client still owns kept back.
 *
 * `local` is what the cache holds right now — the optimistic value — so the
 * result is "everything the server says, except the words I am still typing".
 */
export const mergeRemoteNote = (local: Note | undefined, incoming: Note): Note => {
  const entry = pending.get(incoming.id);
  const live = entry && prune(incoming.id, entry);
  if (!live || !local) return incoming;

  /*
   * Field names are keys of `UpdateNotePayload`, every one of which is also a
   * key of `Note` with a compatible type — but TypeScript cannot follow that
   * through a `Set` iteration, so the copy is done through an index signature
   * and the result asserted back. The narrow `EditableField` type on the set is
   * what keeps the assertion honest: nothing else can get into it.
   */
  const merged: Record<string, unknown> = { ...incoming };
  const source = local as unknown as Record<string, unknown>;
  for (const field of live.fields) merged[field] = source[field];

  return merged as unknown as Note;
};
