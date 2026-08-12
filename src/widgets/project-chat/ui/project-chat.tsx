import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, useDragControls, useMotionValue } from 'framer-motion';
import { GripHorizontal, Pin, X } from 'lucide-react';

import { useRealtime } from '@/app/providers/realtime-provider';
import { chatApi } from '@/entities/chat/api/chat.api';
import type { ChatMessage } from '@/entities/chat/model/types';
import { useCurrentUser } from '@/features/auth/model/session.store';
import { ChatPin } from '@/features/project-chat-dock/ui/chat-pin';
import { queryKeys } from '@/shared/api/query-keys';
import { cn } from '@/shared/lib/cn';
import { formatTime } from '@/shared/lib/dates';
import { STORAGE_KEYS } from '@/shared/config/constants';
import { useLocalStorage } from '@/shared/lib/hooks';
import { Avatar, Button, SendGlyph } from '@/shared/ui';

interface ProjectChatProps {
  projectId: string;
  projectName: string;
  /** Closing takes the window down for good — see the dock store. */
  onClose: () => void;
  /** Whether the tack is in, i.e. the window outlives the project page. */
  isPinned: boolean;
  onPinnedChange: (isPinned: boolean) => void;
}

/**
 * The floating, draggable project chat.
 *
 * Dragging uses Framer Motion motion values rather than dnd-kit: this window is
 * free-floating (no drop targets, no sorting), so a transform-only drag with no
 * React re-render is both simpler and smoother. dnd-kit stays where it earns
 * its keep — the task board, which needs droppable columns.
 *
 * Two deliberate details:
 *
 *   - Only the header starts a drag (`dragControls` + `dragListener={false}`).
 *     The whole window used to be the handle, which meant selecting a line of
 *     somebody's message dragged the conversation across the screen instead.
 *   - The window is mounted by the app layout rather than by the project page,
 *     so a pinned conversation survives navigation. Everything about *whether*
 *     it is pinned lives in the dock store; this component only draws it.
 *
 * The last position is remembered per device.
 */
export const ProjectChat = ({
  projectId,
  projectName,
  onClose,
  isPinned,
  onPinnedChange,
}: ProjectChatProps) => {
  const user = useCurrentUser();
  const { socket, isConnected } = useRealtime();

  const [storedPosition, setStoredPosition] = useLocalStorage(STORAGE_KEYS.chatPosition, {
    x: 0,
    y: 0,
  });
  const x = useMotionValue(storedPosition.x);
  const y = useMotionValue(storedPosition.y);
  const dragControls = useDragControls();

  const [draft, setDraft] = useState('');
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, number>>({});
  /** The window lights up while the tack is being carried over it. */
  const [isPinTargeted, setIsPinTargeted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLElement>(null);

  const { data: history = [] } = useQuery({
    queryKey: queryKeys.chat.history(projectId),
    queryFn: () => chatApi.history(projectId, { limit: 50 }),
    enabled: Boolean(projectId),
  });

  const messages = useMemo(() => {
    const seen = new Set(history.map((message) => message.id));
    return [...history, ...liveMessages.filter((message) => !seen.has(message.id))];
  }, [history, liveMessages]);

  // A pinned window that moved to another project must not keep the previous
  // conversation's live tail underneath the new history.
  useEffect(() => setLiveMessages([]), [projectId]);

  // Incoming messages + typing indicators.
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (message: ChatMessage) => {
      if (message.projectId !== projectId) return;

      setLiveMessages((current) =>
        current.some((entry) => entry.id === message.id) ? current : [...current, message],
      );
    };

    const handleTyping = (payload: { projectId: string; userId: string }) => {
      if (payload.projectId !== projectId || payload.userId === user?.id) return;
      setTypingUsers((current) => ({ ...current, [payload.userId]: Date.now() }));
    };

    socket.on('chat:message', handleMessage);
    socket.on('chat:typing', handleTyping);

    return () => {
      socket.off('chat:message', handleMessage);
      socket.off('chat:typing', handleTyping);
    };
  }, [projectId, socket, user?.id]);

  // Typing badges expire on their own.
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingUsers((current) => {
        const fresh = Object.entries(current).filter(([, at]) => Date.now() - at < 2600);
        return fresh.length === Object.keys(current).length ? current : Object.fromEntries(fresh);
      });
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  // The window is only ever mounted while it is open, so anything arriving
  // here has by definition been seen — counting what was missed is the closed
  // case, and that belongs to `useProjectChatUnread`.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const send = () => {
    const content = draft.trim();
    if (!content || !socket || !isConnected) return;

    socket.emit('chat:send', { projectId, content, clientId: crypto.randomUUID() });
    setDraft('');
  };

  const typingCount = Object.keys(typingUsers).length;

  return (
    <motion.div
      drag
      // Only the header is a handle — see the note above.
      dragListener={false}
      dragControls={dragControls}
      dragMomentum={false}
      dragElastic={0}
      // Keeps the window inside the viewport on any screen size.
      dragConstraints={{
        left: -window.innerWidth + 380,
        right: 24,
        top: -window.innerHeight + 220,
        bottom: 24,
      }}
      style={{ x, y }}
      onDragEnd={() => setStoredPosition({ x: x.get(), y: y.get() })}
      initial={{ opacity: 0, scale: 0.96, y: 20 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      className="gpu fixed bottom-4 right-4 z-40 w-[min(360px,calc(100vw-2rem))] sm:bottom-6 sm:right-6"
    >
      {/* The tack lives outside the window's own box, which is why it cannot
          be a child of the panel — that one clips its overflow. */}
      <ChatPin
        isPinned={isPinned}
        onPinnedChange={onPinnedChange}
        targetRef={windowRef}
        onHoverTargetChange={setIsPinTargeted}
      />

      <aside
        ref={windowRef}
        className={cn(
          'panel flex h-[440px] flex-col overflow-hidden sm:h-[460px]',
          // While the tack is over the window, say so — a drop target you
          // cannot see is a gesture you have to guess at.
          isPinTargeted && 'ring-2 ring-brand ring-offset-2 ring-offset-surface',
          isPinned && !isPinTargeted && 'ring-1 ring-brand/40',
        )}
      >
        <header
          onPointerDown={(event) => dragControls.start(event)}
          className="flex cursor-grab touch-none select-none items-center gap-2 border-b border-edge px-3 py-2.5 active:cursor-grabbing"
        >
          <GripHorizontal className="h-3.5 w-3.5 shrink-0 text-content-faint" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">{projectName}</p>
            <p className="flex items-center gap-1 text-[10px] text-content-faint">
              {isPinned && (
                <>
                  <Pin className="h-2.5 w-2.5 fill-current text-brand" />
                  <span className="text-brand">Pinned</span>
                  <span aria-hidden>·</span>
                </>
              )}
              {typingCount > 0
                ? `${typingCount} typing…`
                : isConnected
                  ? 'Connected'
                  : 'Reconnecting…'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            // The one way out, pinned or not — stated here so nobody has to
            // work out that they need to unpin first.
            title="Close the chat"
            aria-label="Close chat"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </header>

        <div ref={scrollRef} className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-3 py-3">
          {messages.length === 0 && (
            <p className="py-8 text-center text-xs text-content-faint">
              No messages yet. Say hello to the roster.
            </p>
          )}

          {messages.map((message) => {
            const isMine = message.userId === user?.id;

            return (
              <div
                key={message.id}
                className={cn('flex items-end gap-2', isMine && 'flex-row-reverse')}
              >
                <Avatar name={message.user.displayName} src={message.user.avatarUrl} size="xs" />
                <div
                  className={cn(
                    'max-w-[72%] rounded-2xl px-3 py-2 text-xs leading-relaxed',
                    isMine
                      ? 'rounded-br-sm bg-brand text-brand-contrast'
                      : 'rounded-bl-sm bg-surface-sunken text-content',
                  )}
                >
                  {!isMine && (
                    <p className="mb-0.5 text-[10px] font-semibold opacity-70">
                      {message.user.displayName}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  <p className="mt-1 text-[9px] opacity-60">{formatTime(message.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>

        <form
          className="flex items-center gap-2 border-t border-edge p-2.5"
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
        >
          <input
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              socket?.emit('chat:typing', { projectId });
            }}
            placeholder={isConnected ? 'Write a message…' : 'Offline'}
            disabled={!isConnected}
            className="field h-9 text-xs"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!draft.trim() || !isConnected}
            aria-label="Send"
          >
            <SendGlyph />
          </Button>
        </form>
      </aside>
    </motion.div>
  );
};
