import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { taskApi } from '@/entities/task/api/task.api';
import type { ListTasksParams } from '@/entities/task/model/types';
import { useSessionStore } from '@/features/auth/model/session.store';
import { queryKeys } from '@/shared/api/query-keys';

/**
 * The task menu's opening query, exactly as the page asks for it.
 *
 * It has to match `TaskMenuPage`'s initial filters character for character:
 * the filters are part of the query key, so a prefetch under a different shape
 * fills a cache the page will never read, which is the worst of both — a
 * request paid for and a spinner anyway.
 */
const AGENDA_PREFETCH: ListTasksParams = { scope: 'mine', hideCompleted: true };

/**
 * Fetches the task menu's agenda before anybody asks for it.
 *
 * ## Why the shell and not the page
 *
 * By the time `TaskMenuPage` mounts, its request is on the critical path: the
 * route is lazy, so the chunk downloads, the component mounts, *then* the fetch
 * starts, and the tasks land some distance behind the page they belong to. That
 * is the sequence behind "the page loads and the tasks appear afterwards", and
 * no amount of work inside the page can fix it, because the page is not there
 * yet when the fetch should have started.
 *
 * The shell is. It mounts once, on the first authenticated render, and the
 * agenda is small, cached, and wanted by the single most-visited route in the
 * app. Starting it here means the request overlaps the dashboard's own render
 * and the lazy chunk's download, so by the time somebody clicks "Tasks" the
 * answer is usually already in the cache and the page draws populated.
 *
 * ## Why it is cheap
 *
 * `prefetchQuery` with a `staleTime` is a no-op against a cache that already
 * holds fresh data — including one restored from the last session by
 * `hydrateQueryCache` — so this is one request per cold start, not one per
 * navigation. Failures are swallowed on purpose: nothing is waiting on it, and
 * the page will report its own error properly if the data is really
 * unreachable.
 *
 * Deliberately just this one. Prefetching everything is how a cold start turns
 * into a burst of parallel requests against a container that is still waking
 * up — the exact problem `refetchOnWindowFocus: false` was turned off for.
 */
export const useShellPrefetch = (): void => {
  const queryClient = useQueryClient();
  const status = useSessionStore((state) => state.status);

  useEffect(() => {
    if (status !== 'authenticated') return;

    void queryClient
      .prefetchQuery({
        queryKey: queryKeys.tasks.agenda(AGENDA_PREFETCH),
        queryFn: () => taskApi.agenda(AGENDA_PREFETCH),
        staleTime: 15_000,
      })
      .catch(() => undefined);
  }, [queryClient, status]);
};
