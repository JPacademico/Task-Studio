import type { QueryClient } from '@tanstack/react-query';

import { STORAGE_KEYS } from '@/shared/config/constants';

/**
 * The query cache, kept across reloads.
 *
 * ## The problem
 *
 * Every screen in this app starts empty and fills in. That is correct on the
 * *first* visit and wrong on every one after it: the tasks a user is coming
 * back to are, almost always, exactly the tasks they were looking at a minute
 * ago — but the cache lives in JavaScript memory, so a reload, a return to an
 * installed PWA or a restored tab throws all of it away and the page has to ask
 * the server again before it can draw anything. On a free-tier API that can
 * spin down between visits, "again" is not instant, and the result is the thing
 * that reads as broken: the page appears, and then the tasks appear.
 *
 * ## The approach
 *
 * Write a whitelisted slice of the cache to `localStorage` and read it back
 * before the first render. React Query then treats it as data it already has —
 * it paints immediately and revalidates in the background — which is the whole
 * behaviour that was missing. Nothing here changes what is *correct*, only what
 * is on screen while the correct answer is on its way.
 *
 * ## Why hand-rolled
 *
 * `@tanstack/query-persist-client` does this and more. The "more" is the part
 * that does not fit: it is another dependency on a bundle that is deliberately
 * chunked, it persists the whole cache by default, and its rehydration is
 * asynchronous, which reintroduces a frame of emptiness on the exact path this
 * exists to remove. What is actually needed is a filter, a JSON blob and a
 * debounced write.
 *
 * ## What is *not* persisted, and why
 *
 * Only the caches whose absence is visible as a blank page: tasks, projects and
 * board snapshots. Notifications, chat and the AI history are deliberately
 * excluded — they are either sensitive to being even slightly stale or cheap
 * enough that a spinner is honest. Nothing here is a substitute for a request;
 * everything written is marked stale on read.
 *
 * ## Privacy
 *
 * This is the same class of store as `task-studio-api` in the service worker,
 * and it needs the same discipline: it holds one user's tasks, in plain text,
 * on a device that may be shared. So the blob is stamped with the user it
 * belongs to and dropped the moment a different one signs in, and `clear()` is
 * called from the same place `purgeApiCache()` is. It is a disclosure surface,
 * not an authentication one — the tokens are separate and already cleared —
 * but a reload showing the previous user's agenda is not acceptable either way.
 */

/** Only these key prefixes are written. See the note above. */
const PERSISTED_PREFIXES = ['tasks', 'projects', 'notes'] as const;

/**
 * Cache older than this is dropped rather than shown.
 *
 * Long enough to cover the gap this exists for — closing the tab, coming back
 * later in the day — and short enough that nobody is ever shown a board from
 * last week while the real one loads. Stale-but-recent is a head start; stale
 * and old is a lie with a spinner next to it.
 */
const MAX_AGE_MS = 24 * 60 * 60_000;

/**
 * A ceiling on what is written, because `localStorage` is small (~5 MB per
 * origin) and shared with the tokens and every UI preference. A board with a
 * few hundred notes serialises large; losing the persisted copy is a slower
 * page, while filling the quota would break the *session*, which is a far worse
 * failure. Measured on the serialised string, which is what actually costs.
 */
const MAX_BYTES = 1_500_000;

/** How long the cache must be quiet before it is written. */
const WRITE_DELAY_MS = 1_000;

interface PersistedEntry {
  key: readonly unknown[];
  state: { data: unknown; dataUpdatedAt: number };
}

interface PersistedBlob {
  version: number;
  userId: string;
  savedAt: number;
  entries: PersistedEntry[];
}

/**
 * Bump to invalidate every persisted cache after a shape change.
 *
 * 2: a `Task` grew a `file`, and the removal of the board's "Team tasks" tab
 * means a persisted `tasks` key can carry a `scope` the API no longer accepts.
 * Neither would break anything on its own — a missing field reads as absent and
 * an orphaned key has no observer to refetch it — but a cache whose entries
 * predate the shape they are typed as is exactly what this number is for.
 */
const VERSION = 2;

const isPersistable = (key: readonly unknown[]): boolean =>
  typeof key[0] === 'string' && PERSISTED_PREFIXES.includes(key[0] as never);

const serialise = (userId: string, entries: PersistedEntry[]): string =>
  JSON.stringify({
    version: VERSION,
    userId,
    savedAt: Date.now(),
    entries,
  } satisfies PersistedBlob);

const read = (): PersistedBlob | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.queryCache);
    if (!raw) return null;

    const blob = JSON.parse(raw) as PersistedBlob;
    if (blob.version !== VERSION) return null;
    if (Date.now() - blob.savedAt > MAX_AGE_MS) return null;

    return blob;
  } catch {
    // Corrupt, or storage disabled. Either way there is nothing to restore and
    // nothing worth reporting: the app works, it just starts cold.
    return null;
  }
};

export const clearPersistedQueries = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.queryCache);
  } catch {
    /* storage disabled — nothing was written in the first place */
  }
};

/**
 * Fills the cache from the last session's, if it belongs to this user.
 *
 * Synchronous and called before the tree mounts, so the first render already
 * has data. `dataUpdatedAt` is restored as it was rather than reset to now,
 * which is what makes React Query treat every restored entry as stale and
 * refetch it — the persisted copy is a head start, never an answer.
 */
export const hydrateQueryCache = (client: QueryClient, userId: string): void => {
  const blob = read();

  if (!blob) return;
  if (blob.userId !== userId) {
    // A different person used this device. Theirs is not ours to read.
    clearPersistedQueries();
    return;
  }

  for (const entry of blob.entries) {
    if (entry.state.data === undefined) continue;

    client.setQueryData(entry.key, entry.state.data, {
      updatedAt: entry.state.dataUpdatedAt,
    });
  }
};

/**
 * Starts writing the cache back, debounced. Returns the unsubscribe.
 *
 * Debounced because the cache changes constantly — every optimistic write,
 * every socket patch, every keystroke on a board — and serialising it on each
 * one would put a JSON stringify of the whole agenda on the same thread as the
 * typing. A second of quiet is well inside the window between a change and a
 * reload, and coalesces a burst into one write.
 */
export const persistQueryCache = (client: QueryClient, userId: string): (() => void) => {
  let timer: number | undefined;

  const write = () => {
    timer = undefined;

    try {
      const entries: PersistedEntry[] = [];

      for (const query of client.getQueryCache().getAll()) {
        if (query.state.status !== 'success' || query.state.data === undefined) continue;
        if (!isPersistable(query.queryKey)) continue;

        entries.push({
          key: query.queryKey,
          state: { data: query.state.data, dataUpdatedAt: query.state.dataUpdatedAt },
        });
      }

      if (entries.length === 0) {
        clearPersistedQueries();
        return;
      }

      /*
       * Newest first, then dropped from the tail until it fits.
       *
       * This used to abandon the write entirely when it went over budget, which
       * was survivable while the cache held a handful of entries and became a
       * silent failure the moment `gcTime` was raised to half an hour: far more
       * inactive queries stay alive now, so a session that visits several
       * projects can cross the ceiling — and the symptom would have been the
       * first-paint-from-cache behaviour quietly switching itself off, with
       * nothing anywhere to say why.
       *
       * Sorting by recency first means what survives the trim is what the next
       * visit is most likely to want. Serialising in a loop is a little wasteful
       * and only happens on the rare oversized write.
       */
      entries.sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt);

      let kept = entries;
      let payload = serialise(userId, kept);

      while (payload.length > MAX_BYTES && kept.length > 1) {
        kept = kept.slice(0, Math.max(1, Math.floor(kept.length / 2)));
        payload = serialise(userId, kept);
      }

      // A single entry that is still too big is one enormous board or list;
      // there is nothing left to trim, so keep whatever was already stored.
      if (payload.length > MAX_BYTES) return;

      localStorage.setItem(STORAGE_KEYS.queryCache, payload);
    } catch {
      /*
       * Quota exceeded, private mode, or a value that will not serialise. The
       * persisted cache is an optimisation; failing to write one must never
       * take a working app down with it. Drop what is there so a stale blob
       * cannot outlive the data it was meant to shadow.
       */
      clearPersistedQueries();
    }
  };

  const unsubscribe = client.getQueryCache().subscribe(() => {
    if (timer !== undefined) return;
    timer = window.setTimeout(write, WRITE_DELAY_MS);
  });

  return () => {
    if (timer !== undefined) window.clearTimeout(timer);
    unsubscribe();
  };
};
