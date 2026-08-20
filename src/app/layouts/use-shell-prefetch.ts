import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { boardApi } from '@/entities/note/api/note.api';
import { taskApi } from '@/entities/task/api/task.api';
import type { ListTasksParams } from '@/entities/task/model/types';
import { useSessionStore } from '@/features/auth/model/session.store';
import { queryKeys } from '@/shared/api/query-keys';
import { STORAGE_KEYS } from '@/shared/config/constants';
import { useIntentPrefetch } from '@/shared/lib/use-intent-prefetch';

/**
 * The task menu's opening query, exactly as the page asks for it.
 *
 * It has to match `TaskMenuPage`'s initial filters character for character:
 * the filters are part of the query key, so a prefetch under a different shape
 * fills a cache the page will never read, which is the worst of both — a
 * request paid for and a spinner anyway.
 */
const AGENDA_PREFETCH: ListTasksParams = { scope: 'mine', hideCompleted: true };

/** Matches `TASK_STALE_TIME` in the task queries — same data, same tolerance. */
const TASK_PREFETCH_STALE_MS = 60_000;

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
        staleTime: TASK_PREFETCH_STALE_MS,
      })
      .catch(() => undefined);
  }, [queryClient, status]);
};

/**
 * The board page the notes desk will actually open on.
 *
 * `NotesBoardPage` restores it from local storage, and each page is its own
 * cache entry — so prefetching page 0 for somebody who left the app on page 3
 * fills a cache nothing will read. Reading the same key is the only way to
 * warm the right one.
 */
const rememberedBoardPage = (): number => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.boardPage);
    const parsed = raw ? (JSON.parse(raw) as unknown) : 0;
    return typeof parsed === 'number' && Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
  } catch {
    return 0;
  }
};

/**
 * Warms a nav destination the pointer has settled on.
 *
 * Only the two workspace routes that cost a request worth anticipating. The
 * dashboard is already warm — it is where everybody starts, and the shell
 * prefetch above covers the task menu on cold start anyway; this is the path
 * where somebody has been elsewhere long enough for that to have gone stale.
 *
 * The rest of the menu — invitations, the bin, themes, settings — is either
 * trivial to fetch or rarely visited, and prefetching all of it on a sweep down
 * the sidebar is exactly the request cannon `useIntentPrefetch` exists to
 * prevent. A route not listed here simply returns inert handlers.
 */
export const useRouteIntentPrefetch = (to: string) => {
  const queryClient = useQueryClient();
  const isWarmable = to === '/tasks' || to === '/notes';

  return useIntentPrefetch(isWarmable ? `route:${to}` : undefined, () => {
    if (to === '/tasks') {
      void queryClient.prefetchQuery({
        queryKey: queryKeys.tasks.agenda(AGENDA_PREFETCH),
        queryFn: () => taskApi.agenda(AGENDA_PREFETCH),
        staleTime: TASK_PREFETCH_STALE_MS,
      });
      return;
    }

    const pageIndex = rememberedBoardPage();
    void queryClient.prefetchQuery({
      queryKey: queryKeys.notes.board(pageIndex),
      queryFn: () => boardApi.snapshot(pageIndex),
      staleTime: 20_000,
    });
  });
};
