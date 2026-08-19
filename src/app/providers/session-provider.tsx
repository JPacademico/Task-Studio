import { useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authApi } from '@/features/auth/api/auth.api';
import { useSessionStore } from '@/features/auth/model/session.store';
import { onSessionExpired } from '@/shared/api/client';
import { purgeApiCache } from '@/shared/api/offline-cache';
import { tokenStore } from '@/shared/api/token-store';
import { disconnectSocket } from '@/shared/api/socket';
import { translate } from '@/shared/i18n';

/**
 * Bootstraps the session on cold start and reacts to a definitive 401 from the
 * axios refresh chain (`onSessionExpired`), so an expired session is cleaned up
 * in exactly one place.
 */
export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const { setUser, setStatus, endSession } = useSessionStore();

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (!tokenStore.isAuthenticated) {
        setStatus('unauthenticated');
        return;
      }

      try {
        const user = await authApi.me();
        if (!cancelled) setUser(user);
      } catch {
        // The interceptor already tried to refresh; nothing left to salvage.
        if (!cancelled) endSession();
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [endSession, setStatus, setUser]);

  useEffect(
    () =>
      onSessionExpired(() => {
        endSession();
        disconnectSocket();
        queryClient.clear();
        void purgeApiCache();
        toast.error(translate('session.expired'));
      }),
    [endSession, queryClient],
  );

  return <>{children}</>;
};
