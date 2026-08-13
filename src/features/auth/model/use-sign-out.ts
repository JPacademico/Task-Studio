import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { disconnectSocket } from '@/shared/api/socket';
import { tokenStore } from '@/shared/api/token-store';
import { authApi } from '../api/auth.api';
import { useSessionStore } from './session.store';

/**
 * Ending the session, from anywhere that offers to.
 *
 * There are two doors out of the app now — the account menu in the top bar and
 * the foot of the sidebar — and signing out is four steps in a specific order:
 * revoke the refresh token server-side, drop the socket, clear local state,
 * then leave. Two copies of that is one copy that will eventually forget the
 * socket and leave a dead connection retrying against a revoked token.
 *
 * The server call is best-effort on purpose: if it fails, the tokens are still
 * cleared locally and the user is still signed out here, which is the
 * behaviour anybody clicking "sign out" is asking for.
 */
export const useSignOut = (): (() => Promise<void>) => {
  const navigate = useNavigate();
  const endSession = useSessionStore((state) => state.endSession);

  return useCallback(async () => {
    const refreshToken = tokenStore.getRefreshToken();
    if (refreshToken) await authApi.logout(refreshToken).catch(() => undefined);

    disconnectSocket();
    endSession();
    navigate('/login', { replace: true });
  }, [endSession, navigate]);
};
