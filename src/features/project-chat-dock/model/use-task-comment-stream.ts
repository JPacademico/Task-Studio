import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useRealtime } from '@/app/providers/realtime-provider';
import {
  dropComment,
  markThreadRead,
  noteIncomingComment,
  upsertComment,
} from '@/entities/task-comment/model/queries';
import type { TaskComment } from '@/entities/task-comment/model/types';
import { useCurrentUser } from '@/features/auth/model/session.store';
import { queryKeys } from '@/shared/api/query-keys';
import { useChatDock } from './chat-dock.store';

/** Is this thread on screen right now? Then a comment arriving on it is already read. */
const isWatching = (taskId: string): boolean => {
  const dock = useChatDock.getState();
  return (
    dock.isOpen &&
    dock.view === 'tasks' &&
    dock.threadTaskId === taskId &&
    document.visibilityState === 'visible'
  );
};

/**
 * Keeps every held thread and the thread list current from the project rooms this tab is in.
 * Mounted once, by the dock, so counts move whether or not a window is open.
 */
export const useTaskCommentStream = (): void => {
  const { socket } = useRealtime();
  const queryClient = useQueryClient();
  const userId = useCurrentUser()?.id;

  useEffect(() => {
    if (!socket) return;

    const handleComment = (comment: TaskComment) => {
      upsertComment(queryClient, comment);
      const watching = isWatching(comment.taskId);
      noteIncomingComment(queryClient, comment, comment.userId !== userId && !watching);
      if (watching && comment.userId !== userId) markThreadRead(queryClient, comment.taskId);
    };

    const handleDeleted = (payload: { taskId: string; commentId: string }) => {
      dropComment(queryClient, payload.taskId, payload.commentId);
      void queryClient.invalidateQueries({ queryKey: queryKeys.taskComments.threads });
    };

    socket.on('task:comment', handleComment);
    socket.on('task:comment-deleted', handleDeleted);
    return () => {
      socket.off('task:comment', handleComment);
      socket.off('task:comment-deleted', handleDeleted);
    };
  }, [queryClient, socket, userId]);
};
