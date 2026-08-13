import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import { useProjectRoom, useRealtime } from '@/app/providers/realtime-provider';
import type { ChatMessage } from '@/entities/chat/model/types';
import { useCurrentUser } from '@/features/auth/model/session.store';
import { ProjectChat } from '@/widgets/project-chat/ui/project-chat';
import { useChatDock } from '../model/chat-dock.store';

/**
 * Mounts the project conversation for the whole app.
 *
 * It sits in the layout rather than on the project page for one reason: a
 * pinned window has to survive route changes, and a component owned by a route
 * cannot. Joining the socket room from here is the other half of that — the
 * window is useless on the dashboard if the messages only arrive while the
 * project page is mounted.
 */
export const ChatDock = () => {
  const { pathname } = useLocation();

  const projectId = useChatDock((state) => state.projectId);
  const projectName = useChatDock((state) => state.projectName);
  const isOpen = useChatDock((state) => state.isOpen);
  const isPinned = useChatDock((state) => state.isPinned);
  const close = useChatDock((state) => state.close);
  const setPinned = useChatDock((state) => state.setPinned);

  // Reference-counted, so this and the project page can both hold the room
  // open without either one's cleanup evicting the other.
  useProjectRoom(isOpen ? (projectId ?? undefined) : undefined);

  /** Is the page underneath the window the one the conversation belongs to? */
  const isOnOwningProject = Boolean(projectId) && pathname.startsWith(`/projects/${projectId}`);

  /*
   * Pulling the pin hands the window back to the page that owns it.
   *
   * On the project page that is exactly what happens: the window stays, and
   * the page's own cleanup closes it on the way out. Anywhere else there *is*
   * no owning page mounted — so an unpinned window would have gone on floating
   * over the dashboard with nothing left holding it open, and the only way to
   * get rid of it was the close button. Unpinning off-project therefore closes
   * it there and then, which is what the gesture already meant.
   */
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
 * How much of a project's conversation the user has missed.
 *
 * Counted here rather than inside the window, because the whole point is what
 * arrives while the window is *not* on screen — at which point there is no
 * window to do the counting. Resets the moment that project's chat opens.
 */
export const useProjectChatUnread = (projectId: string | undefined): number => {
  const { socket } = useRealtime();
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
      if (message.projectId !== projectId || message.userId === user?.id) return;
      setUnread((count) => count + 1);
    };

    socket.on('chat:message', handleMessage);
    return () => {
      socket.off('chat:message', handleMessage);
    };
  }, [isShowing, projectId, socket, user?.id]);

  return isShowing ? 0 : unread;
};
