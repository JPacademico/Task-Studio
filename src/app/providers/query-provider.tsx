import { useState, type ReactNode } from 'react';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';

import { errorMessage } from '@/shared/api/client';
import { translate } from '@/shared/i18n';

export const QueryProvider = ({ children }: { children: ReactNode }) => {
  const [client] = useState(
    () =>
      new QueryClient({
        // Background refetch failures are surfaced once, not per component.
        queryCache: new QueryCache({
          onError: (error, query) => {
            if (query.state.data !== undefined) {
              toast.error(errorMessage(error, translate('session.refreshFailed')));
            }
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            /*
             * Half an hour, raised from five minutes, and it is now load-bearing
             * rather than a memory setting.
             *
             * An inactive query is one nobody is currently rendering — which,
             * the moment you navigate away from the dashboard, is every query
             * the dashboard owned. `gcTime` is how long those survive after the
             * last observer unmounts, and task lists are now read *across*
             * surfaces: `seedTasksFor` fills a project board from whatever the
             * dashboard already fetched, and it can only do that while those
             * entries still exist. At five minutes, wandering around the app
             * for a few minutes quietly turned every seed back into a cold
             * fetch, with no signal that anything had changed.
             *
             * The cost is bounded and small: these are lists of small JSON
             * objects, deduplicated by React Query's structural sharing, and
             * they are dropped wholesale on sign-out.
             */
            gcTime: 30 * 60_000,
            retry: (failureCount, error) => {
              // Never retry auth/permission failures — they will not fix themselves.
              const status = (error as { response?: { status?: number } }).response?.status;
              if (status && status >= 400 && status < 500) return false;
              return failureCount < 2;
            },
            /*
             * Off by default, which is a reversal worth explaining.
             *
             * With this on, alt-tabbing back to the app refetched *every* stale
             * query at once — and with a 30s `staleTime` that is most of them,
             * most of the time. On a free-tier API that spins down when idle,
             * the request that wakes the container is very often this fan of
             * refetches nobody asked for, which is the worst possible thing to
             * cold-start on.
             *
             * It was also mostly redundant. The socket already pushes the
             * things that go stale in a way a person would notice — tasks,
             * notes, notifications, and now documents — and those handlers
             * patch the cache directly rather than refetching. Focus-refetching
             * on top of that is asking for data we were already sent.
             *
             * `refetchOnReconnect` stays on, and the distinction is the point:
             * losing the network means we genuinely *missed* socket events, so
             * there is a real gap to close. Switching windows means nothing of
             * the sort.
             *
             * Individual queries can still opt back in where staleness is
             * genuinely user-visible and not socket-backed.
             */
            refetchOnWindowFocus: false,
            // The PWA can resume from a locked screen days later, and every
            // event that arrived while the socket was down is simply gone.
            refetchOnReconnect: true,
          },
          mutations: { retry: 0 },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};
