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
 * How long the revoke is waited on before the sign-out carries on without it. The request is
 * **not** aborted at this point.
 */
const REVOKE_WAIT_MS = 2_000;

export interface SignOut {
  signOut: () => Promise<void>;
  /** Whether a sign-out is in progress, so the control can say so. */
  isSigningOut: boolean;
}

/** Ending the session, from anywhere that offers to. */
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

      // Guarded, where it was not before. `purgeApiCache` talks to the Cache Storage API, which
      // throws outright in a private window and in a browser with site data blocked.
      await purgeApiCache().catch(() => undefined);

      // Third store, same reasoning as the second: `localStorage` holds this user's last agenda and
      // boards in plain text.
      clearPersistedQueries();

      // And the copy in memory, which is what would otherwise be written back. The expiry path
      // (`onSessionExpired`) has always cleared this; the manual one never did.
      queryClient.clear();
      endSession();
      navigate('/login', { replace: true });
    } finally {
      // Both flags reset even though the redirect normally unmounts whatever was holding them.
      // "Normally" is doing real work in that sentence.
      inFlightRef.current = false;
      setIsSigningOut(false);
    }
  }, [endSession, navigate, queryClient]);

  return { signOut, isSigningOut };
};
