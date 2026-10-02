import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';

import { useProjectRoom, useRealtime } from '@/app/providers/realtime-provider';
import { loadConversation, upsertChatMessages } from '@/entities/chat/model/chat-cache';
import type { ChatMessage } from '@/entities/chat/model/types';
import { useCurrentUser } from '@/features/auth/model/session.store';
import { queryKeys } from '@/shared/api/query-keys';
import { ProjectChat } from '@/widgets/project-chat/ui/project-chat';
import { useChatDock } from '../model/chat-dock.store';
import { useChatOutbox } from '../model/chat-outbox';
import { useTaskCommentStream } from '../model/use-task-comment-stream';

/**
 * Mounts the project conversation for the whole app. It sits in the layout rather than on the
 * project page for one reason: a pinned window has to survive route changes.
 */
export const ChatDock = () => {
  const { pathname } = useLocation();

  const projectId = useChatDock((state) => state.projectId);
  const projectName = useChatDock((state) => state.projectName);
  const isOpen = useChatDock((state) => state.isOpen);
  const isPinned = useChatDock((state) => state.isPinned);
  const close = useChatDock((state) => state.close);
  const setPinned = useChatDock((state) => state.setPinned);

  // The unsent-message queue drains from here: the one component that is always mounted, so a
  // message typed offline goes out on reconnect even if its window has since been closed.
  useChatOutbox();
  // Task threads stay current from here too: cards and buttons count unread with the window shut.
  useTaskCommentStream();

  // Every open is a catch-up, said explicitly. The window's own `refetchOnMount` covers the
  // ordinary reopen, but not all of them.
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!isOpen || !projectId) return;
    // `cancelRefetch: false`: if the window's own mount fetch is already out,
    // join it rather than cancel it and send the same request again.
    void queryClient.invalidateQueries(
      { queryKey: queryKeys.chat.history(projectId) },
      { cancelRefetch: false },
    );
  }, [isOpen, projectId, queryClient]);

  // Reference-counted, so this and the project page can both hold the room
  // open without either one's cleanup evicting the other.
  useProjectRoom(isOpen ? (projectId ?? undefined) : undefined);

  /** Is the page underneath the window the one the conversation belongs to? */
  const isOnOwningProject = Boolean(projectId) && pathname.startsWith(`/projects/${projectId}`);

  // Pulling the pin hands the window back to the page that owns it. On the project page that is
  // exactly what happens: the window stays, and the page's own cleanup closes it on the way out.
  const handlePinnedChange = (nextPinned: boolean) => {
    if (!nextPinned && !isOnOwningProject) {
      close();
      return;
    }
    setPinned(nextPinned);
  };

  return (
    <AnimatePresence>
      {isOpen && projectId && (
        <ProjectChat
          key={projectId}
          projectId={projectId}
          projectName={projectName}
          onClose={close}
          isPinned={isPinned}
          onPinnedChange={handlePinnedChange}
        />
      )}
    </AnimatePresence>
  );
};

/**
 * Fetch the conversation before anybody asks for it. Opening the chat used to be the first moment
 * the app went looking for the messages.
 */
export const usePrefetchProjectChat = (projectId: string | undefined): void => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId) return;

    // The same loader the window uses, so the prefetch seeds the cache the
    // window's catch-up then builds on. See `loadConversation`.
    void queryClient.prefetchQuery({
      queryKey: queryKeys.chat.history(projectId),
      queryFn: () => loadConversation(queryClient, projectId),
      staleTime: 30_000,
    });
  }, [projectId, queryClient]);
};

/**
 * How much of a project's conversation the user has missed. Counted here rather than inside the
 * window, because the whole point is what arrives while the window is *not* on screen.
 */
export const useProjectChatUnread = (projectId: string | undefined): number => {
  const { socket } = useRealtime();
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const isShowing = useChatDock(
    (state) => state.isOpen && state.projectId === projectId,
  );

  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (isShowing) setUnread(0);
  }, [isShowing]);

  useEffect(() => {
    if (!socket || !projectId || isShowing) return;

    const handleMessage = (message: ChatMessage) => {
      if (message.projectId !== projectId) return;
      // Kept in the conversation while its window is shut, so opening it has nothing to catch up
      // on.
      upsertChatMessages(queryClient, projectId, [message]);
      if (message.userId === user?.id) return;
      setUnread((count) => count + 1);
    };

    socket.on('chat:message', handleMessage);
    return () => {
      socket.off('chat:message', handleMessage);
    };
  }, [isShowing, projectId, queryClient, socket, user?.id]);

  return isShowing ? 0 : unread;
};
