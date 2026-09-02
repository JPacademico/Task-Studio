/**
 * Keeping repeated writes to one row honest, without making the screen wait.
 *
 * ## The bug this exists to fix
 *
 * Drag a task into **Completed**, then straight back into **To do**. Both moves
 * are optimistic, so the board looks right the whole time — and then, a second
 * later, the card jumps back to Completed on its own, sits there, and finally
 * returns to To do. Nobody touched it. It happens on every surface where two
 * writes to the same row can be in the air at once, and it has two independent
 * causes that have to be fixed separately:
 *
 *   1. **A stale response overwrites newer optimistic state.** The first
 *      request answers with `status: COMPLETED` — a perfectly correct answer to
 *      the question it was asked — and the handler writes it into the cache on
 *      top of the `TODO` the user has already seen. The board is now showing an
 *      answer to a question the user has moved on from.
 *   2. **The requests themselves can land out of order.** Two concurrent POSTs
 *      over one HTTP/2 connection are processed concurrently; nothing promises
 *      the server sees them in the order they left. Lose that race and the row
 *      is *actually* wrong — no amount of client-side cleverness fixes a
 *      database that ended up COMPLETED because the second request arrived
 *      first.
 *
 * ## Why not just serialise the mutations
 *
 * React Query's `scope` does exactly (2): mutations sharing a scope id run one
 * after another. It is what `useToggleMyCompletion` and the grouping board
 * already use, and it is right for them — both are behind controls that disable
 * themselves for the length of the round trip, so a queue never forms in
 * practice.
 *
 * It is the wrong tool for a *drag*. `onMutate` runs when a mutation is
 * dequeued, not when `mutate()` is called, so a scoped second drag would apply
 * no optimistic update at all until the first request came back — the card
 * would snap back to the column it came from and sit there for the length of a
 * round trip. That is a worse bug than the one being fixed, and it is visible
 * on every drag rather than only on a fast pair.
 *
 * ## What this does instead
 *
 * The two halves are solved by the two exports below, and they compose:
 *
 *   - `inWriteOrder` chains the *requests* per key inside `mutationFn`, so the
 *     server sees them in the order the user made them. `onMutate` still runs
 *     immediately, so every drag is still instant.
 *   - `writeSequence` stamps each write and answers "is this still the newest
 *     one for this row?", so a response that is no longer current is dropped
 *     rather than painted.
 *
 * Both are keyed by row id rather than by surface, so two different tasks never
 * queue behind each other — which is the cost `scope` pays for its simplicity.
 *
 * ## Why module state rather than a store
 *
 * Nothing renders from either map. They are bookkeeping for in-flight requests
 * with a lifetime measured in hundreds of milliseconds, and putting them in a
 * store would re-render every subscriber on every keystroke of a drag for a
 * value no component reads.
 */

/** The tail of the in-flight chain per key, while one exists. */
const chains = new Map<string, Promise<unknown>>();

/**
 * Run `task` only once every write already queued for `key` has finished.
 *
 * A rejected write does not poison the ones behind it: the chain is joined with
 * `catch`, so a failed request is a link that simply resolves. The caller still
 * sees its own rejection — `run`'s promise is returned unwrapped.
 *
 * The entry is deleted when the chain drains, so a board left open for an hour
 * holds nothing for rows nobody is touching.
 */
export const inWriteOrder = <T>(key: string, run: () => Promise<T>): Promise<T> => {
  const previous = chains.get(key);
  const next = previous ? previous.then(run, run) : run();

  chains.set(key, next);

  void next
    .catch(() => undefined)
    .finally(() => {
      // Only if nothing has queued behind us in the meantime — otherwise this
      // would drop a chain that is still being waited on.
      if (chains.get(key) === next) chains.delete(key);
    });

  return next;
};

/** The newest write stamped for each key. */
const sequences = new Map<string, number>();

/**
 * Which write is the current one for a row.
 *
 * `claim` is called from `onMutate` and returns a token; `isCurrent` answers
 * whether that token is still the newest. A handler holding a stale token
 * should do nothing at all — not write the server's copy, not roll back, and
 * not invalidate — because a newer optimistic state is on screen and a newer
 * request is on its way to confirm it.
 *
 * Sequence numbers rather than timestamps: two writes inside the same
 * millisecond are entirely possible on a trackpad, and `Date.now()` cannot tell
 * them apart.
 */
export const writeSequence = {
  claim(key: string): number {
    const token = (sequences.get(key) ?? 0) + 1;
    sequences.set(key, token);
    return token;
  },

  isCurrent(key: string, token: number): boolean {
    return sequences.get(key) === token;
  },

  /**
   * Forget a key once its last write has settled.
   *
   * Called from `onSettled` by the holder of the current token, so the map does
   * not accumulate an entry per row touched in a session. Guarded, so a late
   * caller cannot clear a key a newer write is still using.
   */
  release(key: string, token: number): void {
    if (sequences.get(key) === token) sequences.delete(key);
  },
};
