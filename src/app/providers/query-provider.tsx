import { useState, type ReactNode } from 'react';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from '@/shared/lib/toast';

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
            // Half an hour, raised from five minutes, and it is now load-bearing rather than a
            // memory setting.
            gcTime: 30 * 60_000,
            retry: (failureCount, error) => {
              // Never retry auth/permission failures — they will not fix themselves.
              const status = (error as { response?: { status?: number } }).response?.status;
              if (status && status >= 400 && status < 500) return false;
              return failureCount < 2;
            },
            // Off by default, which is a reversal worth explaining. With this on, alt-tabbing back
            // to the app refetched *every* stale query at once.
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
