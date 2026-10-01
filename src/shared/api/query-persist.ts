import type { QueryClient } from '@tanstack/react-query';

import { STORAGE_KEYS } from '@/shared/config/constants';

/** The query cache, kept across reloads. Every screen in this app starts empty and fills in. */

/** Only these key prefixes are written. See the note above. */
const PERSISTED_PREFIXES = ['tasks', 'projects', 'notes'] as const;

/**
 * Cache older than this is dropped rather than shown. Long enough to cover the gap this exists for
 * — closing the tab, coming back later in the day.
 */
const MAX_AGE_MS = 24 * 60 * 60_000;

/**
 * A ceiling on what is written, because `localStorage` is small (~5 MB per origin) and shared with
 * the tokens and every UI preference.
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

/** Bump to invalidate every persisted cache after a shape change. */
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
 * Fills the cache from the last session's, if it belongs to this user. Synchronous and called
 * before the tree mounts, so the first render already has data.
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
 * Starts writing the cache back, debounced. Returns the unsubscribe. Debounced because the cache
 * changes constantly — every optimistic write, every socket patch, every keystroke on a board.
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

      // Newest first, then dropped from the tail until it fits. This used to abandon the write
      // entirely when it went over budget.
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
      // Quota exceeded, private mode, or a value that will not serialise. The persisted cache is an
      // optimisation; failing to write one must never take a working app down with it.
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
