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
 * The task menu's opening query, exactly as the page asks for it. It has to match `TaskMenuPage`'s
 * initial filters character for character: the filters are part of the query key.
 */
const AGENDA_PREFETCH: ListTasksParams = { scope: 'mine', hideCompleted: true };

/** Matches `TASK_STALE_TIME` in the task queries — same data, same tolerance. */
const TASK_PREFETCH_STALE_MS = 60_000;

/**
 * Fetches the task menu's agenda before anybody asks for it. By the time `TaskMenuPage` mounts, its
 * request is on the critical path: the route is lazy, so the chunk downloads, the component mounts.
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
 * The board page the notes desk will actually open on. `NotesBoardPage` restores it from local
 * storage, and each page is its own cache entry.
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
 * Warms a nav destination the pointer has settled on. Only the two workspace routes that cost a
 * request worth anticipating.
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
