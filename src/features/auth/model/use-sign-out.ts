import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { purgeApiCache } from '@/shared/api/offline-cache';
import { clearPersistedQueries } from '@/shared/api/query-persist';
import { disconnectSocket } from '@/shared/api/socket';
import { tokenStore } from '@/shared/api/token-store';
import { authApi } from '../api/auth.api';
import { useSessionStore } from './session.store';

/**
 * How long the revoke is waited on before the sign-out carries on without it.
 *
 * The request is **not** aborted at this point — it is simply no longer being
 * waited for, so it still lands and still revokes the token a moment later.
 * What is bounded is how long a person stands in front of a spinner having
 * asked to leave.
 *
 * Two seconds because a warm container answers this in well under one, so the
 * ceiling is invisible in the normal case and only fires on the one that
 * actually needed fixing: a tab left open long enough for a free-tier host to
 * stop the container, where the same call takes the length of a cold boot.
 * Waiting that out is thirty to sixty seconds of nothing happening, and every
 * step that genuinely ends the session locally is already complete by then.
 */
const REVOKE_WAIT_MS = 2_000;

export interface SignOut {
  signOut: () => Promise<void>;
  /** Whether a sign-out is in progress, so the control can say so. */
  isSigningOut: boolean;
}

/**
 * Ending the session, from anywhere that offers to.
 *
 * There are two doors out of the app — the account menu in the top bar and the
 * foot of the sidebar — and signing out is a specific order: revoke the
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
 * ## Why it reports progress, and why it stops waiting
 *
 * Both call sites used to fire this and drop the promise, so the control that
 * had been clicked simply sat there. On a warm container that is a hundred
 * milliseconds and nobody notices; on a container the host has stopped, the
 * revoke alone is a cold Node boot — half a minute of a menu item that looks
 * broken, which people answer by clicking it again.
 *
 * So the hook reports `isSigningOut`, and it stops *waiting* on the server
 * after `REVOKE_WAIT_MS` without cancelling the request. Everything that
 * actually ends the session on this device — the socket, the three caches, the
 * tokens, the redirect — is local and runs regardless of what the server says,
 * which is the behaviour anybody clicking "sign out" is asking for.
 */
export const useSignOut = (): SignOut => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const endSession = useSessionStore((state) => state.endSession);

  const [isSigningOut, setIsSigningOut] = useState(false);
  /** Guards a second click while the first is still working. */
  const inFlightRef = useRef(false);

  const signOut = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsSigningOut(true);

    try {
      const refreshToken = tokenStore.getRefreshToken();

      if (refreshToken) {
        const revoked = authApi.logout(refreshToken).catch(() => undefined);
        await Promise.race([
          revoked,
          new Promise((resolve) => setTimeout(resolve, REVOKE_WAIT_MS)),
        ]);
      }

      disconnectSocket();

      /*
       * Guarded, where it was not before.
       *
       * `purgeApiCache` talks to the Cache Storage API, which throws outright
       * in a private window and in a browser with site data blocked. An
       * unhandled rejection here used to abandon the sign-out halfway: tokens
       * still in `localStorage`, session still live, and no redirect — the
       * user stays signed in and nothing says why.
       */
      await purgeApiCache().catch(() => undefined);

      // Third store, same reasoning as the second: `localStorage` holds this
      // user's last agenda and boards in plain text, and the next person to
      // open the app on this device must not be handed them.
      clearPersistedQueries();

      /*
       * And the copy in memory, which is what would otherwise be written back.
       *
       * The expiry path (`onSessionExpired`) has always cleared this; the
       * manual one never did, so signing out left the previous user's tasks in
       * the query cache until something happened to reload the page. With a
       * persister subscribed to that same cache it is no longer merely untidy
       * — an entry settling between here and the unsubscribe would put the
       * blob straight back on disk.
       */
      queryClient.clear();
      endSession();
      navigate('/login', { replace: true });
    } finally {
      /*
       * Both flags reset even though the redirect normally unmounts whatever
       * was holding them. "Normally" is doing real work in that sentence: a
       * failure anywhere above would otherwise leave the app on the same
       * screen with a permanently spinning menu item and no way to try again.
       */
      inFlightRef.current = false;
      setIsSigningOut(false);
    }
  }, [endSession, navigate, queryClient]);

  return { signOut, isSigningOut };
};
