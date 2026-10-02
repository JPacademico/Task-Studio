import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/shared/api/query-keys';
import { tokenStore } from '@/shared/api/token-store';
import { taskCommentApi } from '../api/task-comment.api';
import type { CommentDelivery, TaskComment, TaskThread } from './types';

/** One page of a thread. */
export const COMMENT_PAGE = 50;

const threadsQuery = {
  queryKey: queryKeys.taskComments.threads,
  queryFn: taskCommentApi.threads,
  staleTime: 30_000,
  gcTime: 30 * 60_000,
} as const;

/** Every reachable thread. One request feeds every card, button and list that counts unread. */
export const useTaskThreads = () =>
  useQuery({ ...threadsQuery, enabled: tokenStore.isAuthenticated });

/** Lookups by task id, built once per response rather than once per card. */
const indexes = new WeakMap<TaskThread[], Map<string, TaskThread>>();
const indexOf = (rows: TaskThread[]): Map<string, TaskThread> => {
  let index = indexes.get(rows);
  if (!index) {
    index = new Map(rows.map((row) => [row.taskId, row]));
    indexes.set(rows, index);
  }
  return index;
};

/** How many comments on one task's thread I have not seen. */
export const useTaskUnread = (taskId: string | undefined): number => {
  const { data } = useQuery({
    ...threadsQuery,
    enabled: tokenStore.isAuthenticated && Boolean(taskId),
    select: (rows: TaskThread[]) => (taskId ? (indexOf(rows).get(taskId)?.unread ?? 0) : 0),
  });
  return data ?? 0;
};

/** Unseen comments across one project's task threads. */
export const useProjectThreadUnread = (projectId: string | undefined): number => {
  const { data } = useQuery({
    ...threadsQuery,
    enabled: tokenStore.isAuthenticated && Boolean(projectId),
    select: (rows: TaskThread[]) =>
      rows.reduce((sum, row) => (row.projectId === projectId ? sum + row.unread : sum), 0),
  });
  return data ?? 0;
};

const byTime = (left: TaskComment, right: TaskComment) =>
  left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id);

const sameComment = (left: TaskComment, right: TaskComment) =>
  left.id === right.id || Boolean(left.clientId && left.clientId === right.clientId);

/**
 * A fresh page laid over what is held: the page wins inside its own window, older pages and our
 * unsent copies survive. A comment missing from the window was deleted meanwhile.
 */
const mergePage = (held: TaskComment[], page: TaskComment[]): TaskComment[] => {
  const oldest = page[0]?.createdAt;
  const kept = held.filter(
    (comment) =>
      comment.delivery !== undefined ||
      (page.length >= COMMENT_PAGE && oldest !== undefined && comment.createdAt < oldest),
  );
  const unsent = kept.filter((comment) => !page.some((fresh) => sameComment(fresh, comment)));
  return [...unsent, ...page].sort(byTime);
};

/** One thread's comments, oldest first; the stream keeps it current once loaded. */
export const useThreadComments = (taskId: string | null) => {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: queryKeys.taskComments.thread(taskId ?? 'none'),
    queryFn: async () => {
      const page = await taskCommentApi.list(taskId as string, { limit: COMMENT_PAGE });
      const held =
        queryClient.getQueryData<TaskComment[]>(queryKeys.taskComments.thread(taskId as string)) ??
        [];
      return mergePage(held, page);
    },
    enabled: Boolean(taskId),
    staleTime: 15_000,
    gcTime: 10 * 60_000,
    refetchOnMount: 'always',
  });
};

/** Older comments, prepended. Returns how many arrived, so the caller knows when to stop. */
export const loadEarlierComments = async (
  queryClient: QueryClient,
  taskId: string,
): Promise<number> => {
  const key = queryKeys.taskComments.thread(taskId);
  const held = queryClient.getQueryData<TaskComment[]>(key) ?? [];
  const oldest = held.find((comment) => !comment.delivery);
  if (!oldest) return 0;

  const page = await taskCommentApi.list(taskId, { before: oldest.id, limit: COMMENT_PAGE });
  queryClient.setQueryData<TaskComment[]>(key, (current = []) =>
    [...page.filter((fresh) => !current.some((entry) => sameComment(entry, fresh))), ...current].sort(
      byTime,
    ),
  );
  return page.length;
};

/** Into a held thread: a server copy replaces our optimistic one by client id. */
export const upsertComment = (queryClient: QueryClient, comment: TaskComment): void => {
  const key = queryKeys.taskComments.thread(comment.taskId);
  if (!queryClient.getQueryData(key)) return;

  queryClient.setQueryData<TaskComment[]>(key, (current = []) =>
    [...current.filter((entry) => !sameComment(entry, comment)), comment].sort(byTime),
  );
};

export const dropComment = (queryClient: QueryClient, taskId: string, commentId: string): void => {
  queryClient.setQueryData<TaskComment[]>(queryKeys.taskComments.thread(taskId), (current) =>
    current?.filter((comment) => comment.id !== commentId),
  );
};

export const setCommentDelivery = (
  queryClient: QueryClient,
  taskId: string,
  clientId: string,
  delivery: CommentDelivery | undefined,
): void => {
  queryClient.setQueryData<TaskComment[]>(queryKeys.taskComments.thread(taskId), (current) =>
    current?.map((comment) => (comment.clientId === clientId ? { ...comment, delivery } : comment)),
  );
};

/**
 * A new comment, on the thread list: one more, maybe one more unread, and the newest line. A task
 * the list has never seen sends it back to the server for the row.
 */
export const noteIncomingComment = (
  queryClient: QueryClient,
  comment: TaskComment,
  countsAsUnread: boolean,
): void => {
  const rows = queryClient.getQueryData<TaskThread[]>(queryKeys.taskComments.threads);
  const row = rows?.find((entry) => entry.taskId === comment.taskId);

  if (!rows || !row) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.taskComments.threads });
    return;
  }

  const updated: TaskThread = {
    ...row,
    total: row.total + 1,
    unread: row.unread + (countsAsUnread ? 1 : 0),
    lastCommentAt: comment.createdAt,
    preview: {
      author: comment.externalAuthor ?? comment.user.displayName,
      content: comment.content,
    },
  };
  queryClient.setQueryData<TaskThread[]>(queryKeys.taskComments.threads, [
    updated,
    ...rows.filter((entry) => entry.taskId !== comment.taskId),
  ]);
};

/** Seen: the thread's unread goes to zero here, and on the server. */
export const markThreadRead = (queryClient: QueryClient, taskId: string): void => {
  const rows = queryClient.getQueryData<TaskThread[]>(queryKeys.taskComments.threads);
  if (rows?.some((row) => row.taskId === taskId && row.unread > 0)) {
    queryClient.setQueryData<TaskThread[]>(
      queryKeys.taskComments.threads,
      rows.map((row) => (row.taskId === taskId ? { ...row, unread: 0 } : row)),
    );
  }
  void taskCommentApi.markRead(taskId).catch(() => undefined);
};
