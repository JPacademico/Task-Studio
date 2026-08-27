import { useEffect } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

import { useRealtime } from '@/app/providers/realtime-provider';
import { queryKeys } from '@/shared/api/query-keys';
import { activityApi } from '../api/activity.api';
import type { ActivityEntry, ActivityPage } from './types';

const PAGE_SIZE = 30;

/**
 * A project's changelog, a page at a time.
 *
 * `useInfiniteQuery` rather than a plain one, because this is the only list in
 * the app that genuinely has no ceiling: every list elsewhere is bounded by
 * something real — a roster, a board, a shelf of documents — and a changelog
 * is bounded only by how long the project has existed. Fetching all of it to
 * render the last twenty lines would get slower every week the project runs.
 *
 * `staleTime` is deliberately generous. The socket pushes new lines as they
 * happen (see `useProjectActivityRealtime`), so a refetch on focus would be
 * asking for something the app has already been told.
 */
export const useProjectActivity = (projectId: string | undefined, enabled = true) =>
  useInfiniteQuery({
    queryKey: queryKeys.activity.list(projectId ?? ''),
    queryFn: ({ pageParam }) => activityApi.list(projectId as string, pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (last: ActivityPage) => (last.hasMore ? last.page + 1 : undefined),
    enabled: Boolean(projectId) && enabled,
    staleTime: 60_000,
  });

/**
 * New lines, live, while the tab is open.
 *
 * Prepended into the first cached page rather than invalidating, and that is
 * worth being deliberate about: an invalidation would refetch every page the
 * reader has scrolled through — which on a project with a long history is
 * several requests to learn about one new row, and it would also snap their
 * scroll position as the list rebuilt.
 *
 * `activity:changed` is the other half. It is emitted by the operations that
 * write a *batch* — the GitHub import writes a project, three tasks and a
 * shelf of documents at once — where prepending twenty rows one at a time is
 * worse than simply asking again.
 */
export const useProjectActivityRealtime = (projectId: string | undefined): void => {
  const { socket } = useRealtime();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !projectId) return;

    const key = queryKeys.activity.list(projectId);

    const handleNew = (entry: ActivityEntry) => {
      queryClient.setQueryData<{ pages: ActivityPage[]; pageParams: unknown[] }>(
        key,
        (current) => {
          if (!current || current.pages.length === 0) return current;

          const [first, ...rest] = current.pages;
          // A socket can deliver the same event twice across a reconnect; the
          // id is what makes prepending idempotent.
          if (first.items.some((item) => item.id === entry.id)) return current;

          return {
            ...current,
            pages: [
              { ...first, items: [entry, ...first.items], total: first.total + 1 },
              ...rest,
            ],
          };
        },
      );
    };

    const handleChanged = () => {
      void queryClient.invalidateQueries({ queryKey: key });
    };

    socket.on('activity:new', handleNew);
    socket.on('activity:changed', handleChanged);

    return () => {
      socket.off('activity:new', handleNew);
      socket.off('activity:changed', handleChanged);
    };
  }, [projectId, queryClient, socket]);
};
