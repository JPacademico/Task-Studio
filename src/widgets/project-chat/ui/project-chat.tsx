import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, useDragControls, useMotionValue } from 'framer-motion';
import { AlertCircle, Check, Clock3, GripHorizontal, Pin, X } from 'lucide-react';

import { useRealtime } from '@/app/providers/realtime-provider';
import { chatApi } from '@/entities/chat/api/chat.api';
import type { ChatMessage } from '@/entities/chat/model/types';
import { useCurrentUser } from '@/features/auth/model/session.store';
import { ChatPin } from '@/features/project-chat-dock/ui/chat-pin';
import { useT } from '@/shared/i18n';
import { emitWithAck } from '@/shared/api/socket';
import { queryKeys } from '@/shared/api/query-keys';
import { cn } from '@/shared/lib/cn';
import { formatTime } from '@/shared/lib/dates';
import { STORAGE_KEYS, TEXT_LIMITS } from '@/shared/config/constants';
import { clampText } from '@/shared/lib/text';
import { useIsTouchDevice, useLocalStorage } from '@/shared/lib/hooks';
import { Avatar, Button, SendGlyph, SkinLoader } from '@/shared/ui';

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
  const t = useT();
  const isTouch = useIsTouchDevice();
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

  /*
   * History is fetched rarely and kept for a long time, because the socket is
   * what keeps this view current.
   *
   * On the global 30s `staleTime` every reopen of the window — and every
   * navigation with it pinned — re-ran this query, which meant a network round
   * trip standing between the click and the conversation on a surface that had
   * the conversation a moment ago. The refetch was also close to pointless:
   * anything that changed since the last fetch arrived over `chat:message` and
   * is already in `liveMessages`.
   *
   * The long `gcTime` is the half that makes reopening instant. Without it the
   * cache is dropped five minutes after the window closes, and the next open
   * starts from nothing again.
   *
   * `refetchOnReconnect` stays on globally, which is the case this trades
   * against: a dropped connection is the one situation where events were
   * genuinely missed and the history really is behind.
   */
  const { data: history = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: queryKeys.chat.history(projectId),
    queryFn: () => chatApi.history(projectId, { limit: 50 }),
    enabled: Boolean(projectId),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
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

      setLiveMessages((current) => {
        if (current.some((entry) => entry.id === message.id)) return current;

        /*
         * Our own message coming back.
         *
         * The optimistic copy drawn by `send` is already on screen under a
         * local id, so appending this would show the same sentence twice for a
         * moment and then leave two entries that never merge. `clientId` is the
         * only thing tying the two together — the server id did not exist when
         * we drew ours — so it is matched on, and the server's version replaces
         * ours in place. Replacing rather than removing-and-appending keeps it
         * where the reader is already looking, and carries over the real id,
         * timestamp and any server-side edit to the content.
         */
        if (message.clientId) {
          const mine = current.findIndex((entry) => entry.clientId === message.clientId);
          if (mine !== -1) {
            const next = [...current];
            next[mine] = message;
            return next;
          }
        }

        return [...current, message];
      });
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

  /**
   * Marks one of our own in-flight messages, found by `clientId`.
   *
   * A no-op if it is already gone — the broadcast can beat the acknowledgement,
   * in which case the message has been replaced by the server's copy and there
   * is nothing left to annotate.
   */
  const markDelivery = (clientId: string, delivery: ChatMessage['delivery']) => {
    setLiveMessages((current) => {
      const index = current.findIndex((entry) => entry.clientId === clientId);
      if (index === -1) return current;

      const next = [...current];
      next[index] = { ...next[index], delivery };
      return next;
    });
  };

  /**
   * Draw the message first, send it second.
   *
   * Previously this emitted and cleared the input, and the sentence did not
   * appear until the server had written it to Postgres and fanned it back out —
   * so the person who typed it watched an empty conversation for a round trip
   * and had no way to tell a slow network from a lost message.
   *
   * Now the local copy goes up immediately with a `pending` mark, and the
   * gateway's acknowledgement settles it: the broadcast usually arrives first
   * and replaces it outright, and the ack is the backstop that catches the
   * cases the broadcast cannot describe — a rate-limited send, a timeout, a
   * socket that dropped between the click and the write.
   *
   * `delivery: 'failed'` is deliberately left on screen rather than rolled
   * back. A message that vanishes reads as a message that was never typed; one
   * with a warning on it reads as something to send again, which is what
   * actually happened.
   */
  const send = () => {
    const content = draft.trim();
    if (!content || !socket || !isConnected || !user) return;

    const clientId = crypto.randomUUID();

    setLiveMessages((current) => [
      ...current,
      {
        // Namespaced so it can never collide with a server uuid, and so a
        // stray local id is obvious if one ever escapes into a cache.
        id: `local:${clientId}`,
        clientId,
        content,
        createdAt: new Date().toISOString(),
        editedAt: null,
        deletedAt: null,
        projectId,
        userId: user.id,
        user,
        delivery: 'pending',
      },
    ]);
    setDraft('');

    void emitWithAck<{ delivered?: boolean; rateLimited?: boolean }>('chat:send', {
      projectId,
      content,
      clientId,
    })
      .then((ack) => {
        markDelivery(clientId, ack?.delivered ? undefined : 'failed');
      })
      .catch(() => markDelivery(clientId, 'failed'));
  };

  const typingCount = Object.keys(typingUsers).length;

  return (
    /*
     * A floating window on a pointer device, a sheet on a phone.
     *
     * The draggable window is the whole point of this component on a desktop —
     * you park the conversation somewhere and keep working around it. None of
     * that survives a 375px screen: at `min(360px, 100vw-2rem)` the window is
     * already the full width, so there is nowhere to park it, and the drag
     * handle only competes with the scroll gesture for the message list right
     * underneath it. The pin is meaningless for the same reason — a window that
     * fills the screen is either open or closed.
     *
     * So touch gets a bottom sheet: full width, anchored, no drag, no tack, and
     * `dvh` height so the composer sits above the address bar instead of behind
     * it. Desktop keeps every bit of the original behaviour.
     */
    <motion.div
      drag={!isTouch}
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
      // A sheet is positioned by the layout, so a stored desktop offset must
      // not carry over and push it off-screen.
      style={isTouch ? undefined : { x, y }}
      onDragEnd={() => setStoredPosition({ x: x.get(), y: y.get() })}
      initial={{ opacity: 0, scale: 0.96, y: 20 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      className={cn(
        'gpu fixed z-40',
        isTouch
          ? 'inset-x-0 bottom-0'
          : 'bottom-4 right-4 w-[min(360px,calc(100vw-2rem))] sm:bottom-6 sm:right-6',
      )}
    >
      {/* The tack lives outside the window's own box, which is why it cannot
          be a child of the panel — that one clips its overflow. */}
      {!isTouch && (
        <ChatPin
          isPinned={isPinned}
          onPinnedChange={onPinnedChange}
          targetRef={windowRef}
          onHoverTargetChange={setIsPinTargeted}
        />
      )}

      <aside
        ref={windowRef}
        className={cn(
          'panel flex flex-col overflow-hidden',
          isTouch
            ? 'h-[min(80dvh,32rem)] rounded-b-none safe-b'
            : 'h-[440px] sm:h-[460px]',
          // While the tack is over the window, say so — a drop target you
          // cannot see is a gesture you have to guess at.
          isPinTargeted && 'ring-2 ring-brand ring-offset-2 ring-offset-surface',
          isPinned && !isPinTargeted && 'ring-1 ring-brand/40',
        )}
      >
        <header
          onPointerDown={isTouch ? undefined : (event) => dragControls.start(event)}
          className={cn(
            'flex select-none items-center gap-2 border-b border-edge px-3 py-2.5',
            !isTouch && 'cursor-grab touch-none active:cursor-grabbing',
          )}
        >
          {!isTouch && (
            <GripHorizontal className="h-3.5 w-3.5 shrink-0 text-content-faint" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">{projectName}</p>
            <p className="flex items-center gap-1 text-[10px] text-content-faint">
              {isPinned && (
                <>
                  <Pin className="h-2.5 w-2.5 fill-current text-brand" />
                  <span className="text-brand">{t('chat.pinned')}</span>
                  <span aria-hidden>·</span>
                </>
              )}
              {typingCount > 0
                ? t('chat.typing', { count: typingCount })
                : isConnected
                  ? t('chat.connected')
                  : t('chat.reconnecting')}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            // The one way out, pinned or not — stated here so nobody has to
            // work out that they need to unpin first.
            title={t('chat.closeTitle')}
            aria-label={t('chat.close')}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </header>

        <div ref={scrollRef} className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-3 py-3">
          {/*
            Waiting, rather than an empty box that looks like an empty room.

            `isLoading` and not `isPending`: the query is gated on `projectId`,
            and a disabled query is pending forever — which would have left the
            loader spinning on a window with no project behind it. `isLoading`
            is pending *and fetching*, i.e. the one state where bytes are
            actually on their way.

            The history is cached for half an hour (see the note on the query),
            so this is the first open of a conversation and almost nothing else.
            That is exactly when the difference matters: before this, a cold
            fetch drew "No messages yet" for the length of a round trip, which
            is not slow — it is *wrong*, and on a shared project it is the one
            wrong thing a chat window can say.

            `SkinLoader` rather than a spinner, so the wait is drawn in whatever
            the reader's theme is made of — ink, gears, sprites, an orbit.
          */}
          {isLoadingHistory && messages.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10">
              <SkinLoader label={t('chat.loading')} />
              <p className="text-[11px] text-content-faint">{t('chat.loading')}</p>
            </div>
          )}

          {!isLoadingHistory && messages.length === 0 && (
            <p className="py-8 text-center text-xs text-content-faint">
              {t('chat.empty')}
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
                    // A failed send is the one state that must survive being
                    // glanced at, so it changes the bubble rather than adding a
                    // detail inside it.
                    message.delivery === 'failed' && 'opacity-80 ring-1 ring-danger',
                  )}
                >
                  {!isMine && (
                    <p className="mb-0.5 text-[10px] font-semibold opacity-70">
                      {message.user.displayName}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  <p className="mt-1 flex items-center gap-1 text-[9px] opacity-60">
                    {formatTime(message.createdAt)}
                    {/*
                      Only our own messages carry a delivery mark, and only
                      while there is something to say about it: pending, failed,
                      or — once the server's copy has replaced ours — nothing at
                      all beyond the tick that says it landed.
                    */}
                    {isMine && message.delivery === 'pending' && (
                      <Clock3 className="h-2.5 w-2.5" aria-label={t('chat.sending')} />
                    )}
                    {isMine && message.delivery === undefined && !message.id.startsWith('local:') && (
                      <Check className="h-2.5 w-2.5" aria-label={t('chat.sent')} />
                    )}
                  </p>
                </div>
                {message.delivery === 'failed' && (
                  <span
                    title={t('chat.notSentHelp')}
                    className="flex items-center text-danger"
                  >
                    <AlertCircle className="h-3.5 w-3.5" aria-label={t('chat.notSent')} />
                  </span>
                )}
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
              setDraft(clampText(event.target.value, TEXT_LIMITS.chatMessage));
              socket?.emit('chat:typing', { projectId });
            }}
            placeholder={isConnected ? t('chat.placeholder') : t('chat.offline')}
            maxLength={TEXT_LIMITS.chatMessage}
            disabled={!isConnected}
            className="field h-9 text-xs"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!draft.trim() || !isConnected}
            aria-label={t('chat.send')}
          >
            <SendGlyph />
          </Button>
        </form>
      </aside>
    </motion.div>
  );
};
