/**
 * The half of "sign out" that lives outside JavaScript memory.
 *
 * `queryClient.clear()` empties React Query, and `tokenStore.clear()` empties
 * localStorage — but the service worker's `task-studio-api` cache is a third
 * store, owned by the browser, that neither of them can see. It is written by
 * the NetworkFirst route in `vite.config.ts` and it holds whole API responses:
 * the signed-in user's projects, tasks, notes and profile.
 *
 * Nothing evicts it on sign-out. So on a shared device the next person to open
 * the app has, sitting in Cache Storage, the previous user's data — and the
 * NetworkFirst handler will serve exactly that the first time the network is
 * slow or absent, before any request has established who is now signed in.
 *
 * The bearer token is gone, so this is not an authentication hole; it is a
 * disclosure one, and it survives a reload, which is worse than it sounds.
 *
 * Only the API cache is dropped. `task-studio-media` holds R2 images addressed
 * by unguessable keys and re-fetching them is a real cost on a metered
 * connection; the precache holds the app shell, which is public.
 */
const API_CACHE = 'task-studio-api';

export const purgeApiCache = async (): Promise<void> => {
  if (typeof caches === 'undefined') return;

  try {
    await caches.delete(API_CACHE);
  } catch {
    /* Storage disabled or evicted mid-flight — nothing to clean up. */
  }
};
