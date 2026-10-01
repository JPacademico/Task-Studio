/**
 * Keeping repeated writes to one row honest, without making the screen wait. Drag a task into
 * **Completed**, then straight back into **To do**.
 */

/** The tail of the in-flight chain per key, while one exists. */
const chains = new Map<string, Promise<unknown>>();

/**
 * Run `task` only once every write already queued for `key` has finished. A rejected write does not
 * poison the ones behind it: the chain is joined with `catch`.
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
 * Which write is the current one for a row. `claim` is called from `onMutate` and returns a token;
 * `isCurrent` answers whether that token is still the newest.
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
   * Forget a key once its last write has settled. Called from `onSettled` by the holder of the
   * current token, so the map does not accumulate an entry per row touched in a session.
   */
  release(key: string, token: number): void {
    if (sequences.get(key) === token) sequences.delete(key);
  },
};
