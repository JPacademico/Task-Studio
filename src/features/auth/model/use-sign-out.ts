import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { purgeApiCache } from '@/shared/api/offline-cache';
import { clearPersistedQueries } from '@/shared/api/query-persist';
import { disconnectSocket } from '@/shared/api/socket';
import { tokenStore } from '@/shared/api/token-store';
import { authApi } from '../api/auth.api';
import { useSessionStore } from './session.store';

/**
 * Ending the session, from anywhere that offers to.
 *
 * There are two doors out of the app now — the account menu in the top bar and
 * the foot of the sidebar — and signing out is a specific order: revoke the
 * refresh token server-side, drop the socket, evict all three caches, clear
 * local state, then leave. Two copies of that is one copy that will eventually
 * forget the socket and leave a dead connection retrying against a revoked
 * token.
 *
 * The cache evictions are the steps that are easy to miss, because nothing in
 * the app reads those stores directly. There are three of them and they are
 * genuinely separate: the service worker's response cache (`purgeApiCache`),
 * the persisted query blob in `localStorage` (`clearPersistedQueries`), and
 * React Query's own in-memory copy.
 *
 * The server call is best-effort on purpose: if it fails, the tokens are still
 * cleared locally and the user is still signed out here, which is the
 * behaviour anybody clicking "sign out" is asking for.
 */
export const useSignOut = (): (() => Promise<void>) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const endSession = useSessionStore((state) => state.endSession);

  return useCallback(async () => {
    const refreshToken = tokenStore.getRefreshToken();
    if (refreshToken) await authApi.logout(refreshToken).catch(() => undefined);

    disconnectSocket();
    await purgeApiCache();
    // Third store, same reasoning as the second: `localStorage` holds this
    // user's last agenda and boards in plain text, and the next person to open
    // the app on this device must not be handed them. See `query-persist.ts`.
    clearPersistedQueries();
    /*
     * And the copy in memory, which is what would otherwise be written back.
     *
     * The expiry path (`onSessionExpired`) has always cleared this; the manual
     * one never did, so signing out left the previous user's tasks in the query
     * cache until something happened to reload the page. With a persister
     * subscribed to that same cache it is no longer merely untidy — an entry
     * settling between here and the unsubscribe would put the blob straight
     * back on disk.
     */
    queryClient.clear();
    endSession();
    navigate('/login', { replace: true });
  }, [endSession, navigate, queryClient]);
};
