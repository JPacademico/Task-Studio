import { useEffect, useRef, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authApi } from '@/features/auth/api/auth.api';
import { useSessionStore } from '@/features/auth/model/session.store';
import { onSessionExpired } from '@/shared/api/client';
import { purgeApiCache } from '@/shared/api/offline-cache';
import {
  clearPersistedQueries,
  hydrateQueryCache,
  persistQueryCache,
} from '@/shared/api/query-persist';
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
  const userId = useSessionStore((state) => state.user?.id);
  // Hydration happens once per signed-in user, on the render that first knows
  // who they are — never again, or a later pass would write a stale copy back
  // over caches the app has since updated.
  const hydratedFor = useRef<string | null>(null);

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

  /*
   * Last session's tasks, boards and projects, put back before the first paint
   * that could use them.
   *
   * Keyed on the user, and deliberately after `authApi.me()` rather than before
   * it: the blob is only ours to read once we know whose it is. In practice
   * that call is warm and returns long before any page has finished asking for
   * its own data, so the agenda still draws from cache rather than from a
   * spinner. See `query-persist.ts` for what is stored and what is not.
   */
  useEffect(() => {
    if (!userId || hydratedFor.current === userId) return;

    hydratedFor.current = userId;
    hydrateQueryCache(queryClient, userId);

    return persistQueryCache(queryClient, userId);
  }, [queryClient, userId]);

  useEffect(
    () =>
      onSessionExpired(() => {
        endSession();
        disconnectSocket();
        queryClient.clear();
        void purgeApiCache();
        // The persisted copy outlives memory by design, so clearing the cache
        // without clearing this would put the expired session's data straight
        // back on screen at the next reload.
        clearPersistedQueries();
        hydratedFor.current = null;
        toast.error(translate('session.expired'));
      }),
    [endSession, queryClient],
  );

  return <>{children}</>;
};
