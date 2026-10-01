/**
 * The half of "sign out" that lives outside JavaScript memory. `queryClient.clear()` empties React
 * Query, and `tokenStore.clear()` empties localStorage.
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
