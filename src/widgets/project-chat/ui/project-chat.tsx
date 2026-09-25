import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, useDragControls, useMotionValue } from 'framer-motion';
import { AlertCircle, Check, Clock3, GripHorizontal, Pin, RotateCcw, X } from 'lucide-react';

import { useRealtime } from '@/app/providers/realtime-provider';
import {
  CHAT_PAGE,
  loadConversation,
  loadEarlierMessages,
  setLocalDelivery,
  upsertChatMessages,
} from '@/entities/chat/model/chat-cache';
import {
  applyMention,
  isMentionComplete,
  matchMembers,
  mentionQueryAt,
  mentionedIds,
  splitMentions,
} from '@/entities/chat/lib/mentions';
import type { ChatMessage } from '@/entities/chat/model/types';
import { useRoster } from '@/entities/project/model/queries';
import type { RosterMember } from '@/entities/project/model/types';
import { useCurrentUser } from '@/features/auth/model/session.store';
import { enqueueChatMessage } from '@/features/project-chat-dock/model/chat-outbox';
import {
  TYPING_VISIBLE_MS,
  useTypingSignal,
} from '@/features/project-chat-dock/model/use-typing-signal';
import { ChatPin } from '@/features/project-chat-dock/ui/chat-pin';
import { useT } from '@/shared/i18n';
import { queryKeys } from '@/shared/api/query-keys';
import { cn } from '@/shared/lib/cn';
import { uid } from '@/shared/lib/uid';
import { formatTime } from '@/shared/lib/dates';
import { STORAGE_KEYS, TEXT_LIMITS } from '@/shared/config/constants';
import { clampText } from '@/shared/lib/text';
import { useIsTouchDevice, useLocalStorage } from '@/shared/lib/hooks';
import { useViewportDragBounds } from '@/shared/lib/use-viewport-drag-bounds';
import { Avatar, Button, SendGlyph, SkinLoader } from '@/shared/ui';
import { MentionPicker } from './mention-picker';

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

  const queryClient = useQueryClient();
  const typingSignal = useTypingSignal(projectId);

  const [draft, setDraft] = useState('');
  /** Whether "load earlier" has anything left to load. Unknown until a short page says no. */
  const [hasEarlier, setHasEarlier] = useState(true);
  const [isLoadingEarlier, setIsLoadingEarlier] = useState(false);
  /*
   * Everything the `@` picker needs, and nothing it does not.
   *
   * `caret` is tracked in state rather than read from the DOM at use time
   * because the mention being typed is derived during render — "is there an
   * unfinished `@name` immediately behind the cursor" is a question about the
   * draft *and* the position in it, and only one of those was previously a
   * React value.
   *
   * `picked` is every member chosen while writing this message, which is how
   * their ids are known at all: the text says `@Ana Ribeiro` and nothing else
   * in it identifies which Ana. It is filtered against the final text on send
   * — see `mentionedIds` — so editing a name back out also takes the
   * notification with it.
   *
   * `dismissedAt` is the position of an `@` the reader pressed Escape on, so
   * the picker stays shut for that one and opens again for the next.
   */
  const [caret, setCaret] = useState(0);
  const [picked, setPicked] = useState<RosterMember[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, number>>({});
  /** The window lights up while the tack is being carried over it. */
  const [isPinTargeted, setIsPinTargeted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  /** Where the caret must land once React has drawn an inserted mention. */
  const pendingCaret = useRef<number | null>(null);

  /* The window cannot be carried off the screen — see the hook. */
  const { bounds: dragBounds, measure: measureDragBounds } = useViewportDragBounds(
    windowRef,
    x,
    y,
  );

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
  /*
   * `refetchOnMount: 'always'` is the other half of the fix for messages
   * vanishing on reopen. The cached list is drawn at once, and the fetch that
   * follows asks only for what arrived after its newest message — the part
   * that was never delivered while the window was shut and the room left.
   * See `loadConversation`.
   */
  const { data: messages = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: queryKeys.chat.history(projectId),
    queryFn: () => loadConversation(queryClient, projectId),
    enabled: Boolean(projectId),
    staleTime: 30_000,
    gcTime: 30 * 60_000,
    refetchOnMount: 'always',
  });

  /*
   * A socket that dropped and came back missed whatever was said meanwhile —
   * Socket.io replays nothing. Catching up is one small `after` request.
   */
  const wasConnected = useRef(isConnected);
  useEffect(() => {
    if (isConnected && !wasConnected.current) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat.history(projectId) });
    }
    wasConnected.current = isConnected;
  }, [isConnected, projectId, queryClient]);

  /*
   * The roster, for two jobs that look unrelated and are the same one.
   *
   * It is the list the `@` picker offers, and it is also the set of names the
   * renderer will light up in a message that has already been sent. Both need
   * the same answer to "who is in this conversation", and the query is shared,
   * cached for a minute and prefetched by the project page — so having the chat
   * window ask for it costs a request the first time a conversation is opened
   * from somewhere other than its own project, and nothing after that.
   */
  const { data: roster = [] } = useRoster(projectId);

  /** The unfinished `@name` at the caret, if the reader is typing one. */
  const mention = useMemo(() => mentionQueryAt(draft, caret), [draft, caret]);

  const suggestions = useMemo(
    () => (mention ? matchMembers(roster, mention.query) : []),
    [mention, roster],
  );

  /*
   * A picker with nothing in it is not open.
   *
   * That is what keeps an `@` in ordinary prose — an address, a handle for
   * somewhere else, a price — from putting a popover over the conversation:
   * nothing on the roster matches, so there is nothing to show and the keyboard
   * handler below stands down with it.
   */
  const isPickerOpen =
    mention !== null &&
    suggestions.length > 0 &&
    mention.start !== dismissedAt &&
    // ...and the name at the caret is not already finished. Without this the
    // picker reopens on the mention it has just inserted — see
    // `isMentionComplete`.
    !isMentionComplete(mention.query, roster);

  // A different `@`, or a different query behind the same one, is a different
  // question — so the highlighted row goes back to the best match.
  useEffect(() => {
    setMentionIndex(0);
  }, [mention?.start, mention?.query]);

  /*
   * Put the caret back after an insertion.
   *
   * A controlled input rewrites its own value on every render, and doing so
   * drops the selection to the end of the new text — which is only the right
   * place when the mention was inserted at the end. Insert one mid-sentence and
   * the caret would jump past everything after it. This runs after the draft is
   * drawn, so `setSelectionRange` is measuring the text that is actually there.
   */
  useEffect(() => {
    const target = pendingCaret.current;
    if (target === null) return;

    pendingCaret.current = null;
    const input = inputRef.current;
    if (!input) return;

    input.focus();
    input.setSelectionRange(target, target);
  }, [draft]);

  // A pinned window that moved to another project starts not knowing whether
  // that conversation has an older page.
  useEffect(() => setHasEarlier(true), [projectId]);

  // Incoming messages + typing indicators.
  useEffect(() => {
    if (!socket) return;

    /*
     * Into the cache, not into component state — which is what made messages
     * survive the window closing. Our own message coming back retires the
     * optimistic bubble with the same `clientId`; see `mergeMessages`.
     */
    const handleMessage = (message: ChatMessage) => {
      if (message.projectId !== projectId) return;
      upsertChatMessages(queryClient, projectId, [message]);
      // A sentence arriving is the end of that person's typing.
      setTypingUsers((current) => {
        if (!(message.userId in current)) return current;
        const next = { ...current };
        delete next[message.userId];
        return next;
      });
    };

    const handleTyping = (payload: { projectId: string; userId: string; isTyping?: boolean }) => {
      if (payload.projectId !== projectId || payload.userId === user?.id) return;
      setTypingUsers((current) => {
        if (payload.isTyping === false) {
          if (!(payload.userId in current)) return current;
          const next = { ...current };
          delete next[payload.userId];
          return next;
        }
        return { ...current, [payload.userId]: Date.now() };
      });
    };

    socket.on('chat:message', handleMessage);
    socket.on('chat:typing', handleTyping);

    return () => {
      socket.off('chat:message', handleMessage);
      socket.off('chat:typing', handleTyping);
    };
  }, [projectId, queryClient, socket, user?.id]);

  // Typing badges expire on their own — the backstop for a lost "stopped" frame.
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingUsers((current) => {
        const fresh = Object.entries(current).filter(
          ([, at]) => Date.now() - at < TYPING_VISIBLE_MS,
        );
        return fresh.length === Object.keys(current).length ? current : Object.fromEntries(fresh);
      });
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  // The window is only ever mounted while it is open, so anything arriving
  // here has by definition been seen — counting what was missed is the closed
  // case, and that belongs to `useProjectChatUnread`.
  /*
   * Follow the conversation's *end*, not its length.
   *
   * Keyed on the length, loading an older page — which grows the list at the
   * top — yanked the reader from the message they had scrolled up to read
   * straight back to the bottom.
   */
  const lastMessageKey = messages.length > 0
    ? (messages[messages.length - 1].clientId ?? messages[messages.length - 1].id)
    : null;
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [lastMessageKey]);

  /*
   * Older messages go in *above* the reader, so the scroll offset is moved by
   * exactly the height they added — the line being read stays under the eye.
   */
  const heightBeforePrepend = useRef<number | null>(null);
  useLayoutEffect(() => {
    const element = scrollRef.current;
    const before = heightBeforePrepend.current;
    if (!element || before === null) return;
    heightBeforePrepend.current = null;
    element.scrollTop += element.scrollHeight - before;
  }, [messages]);

  const loadEarlier = async () => {
    if (isLoadingEarlier || !hasEarlier) return;
    setIsLoadingEarlier(true);
    heightBeforePrepend.current = scrollRef.current?.scrollHeight ?? null;
    try {
      const count = await loadEarlierMessages(queryClient, projectId);
      if (count < CHAT_PAGE) setHasEarlier(false);
      if (count === 0) heightBeforePrepend.current = null;
    } catch {
      heightBeforePrepend.current = null;
    } finally {
      setIsLoadingEarlier(false);
    }
  };

  /** A failed bubble, back into the outbox with a fresh count. */
  const retry = (message: ChatMessage) => {
    if (!user || !message.clientId) return;
    setLocalDelivery(queryClient, projectId, message.clientId, 'pending');
    enqueueChatMessage(user.id, {
      clientId: message.clientId,
      projectId,
      content: message.content,
      mentions: message.mentions ?? [],
      user: message.user,
      queuedAt: message.createdAt,
      attempts: 0,
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
   *
   * The send itself goes through the outbox (`useChatOutbox`), which is what
   * lets the composer work offline: the bubble goes up as "sending", sits in a
   * queue that survives a reload, and goes out in order the moment the socket
   * is back. A resend carries the same `clientId`, and the API writes it once.
   */
  const send = () => {
    const content = draft.trim();
    if (!content || !user) return;

    // See `shared/lib/uid`: `crypto.randomUUID` does not exist on an insecure
    // origin, and this line ran on every message sent.
    const clientId = uid();
    /*
     * Whoever is still named in the sentence as it stands.
     *
     * Not `picked` itself: that is the log of every row clicked while writing,
     * and a draft gets rewritten. Somebody whose name was typed and then
     * deleted must not be pulled into a conversation that no longer mentions
     * them. See `mentionedIds`.
     */
    const mentions = mentionedIds(content, picked);

    const createdAt = new Date().toISOString();

    upsertChatMessages(queryClient, projectId, [
      {
        // Namespaced so it can never collide with a server uuid, and so a
        // stray local id is obvious if one ever escapes into a cache.
        id: `local:${clientId}`,
        clientId,
        content,
        mentions,
        createdAt,
        editedAt: null,
        deletedAt: null,
        projectId,
        userId: user.id,
        user,
        delivery: 'pending',
      },
    ]);
    setDraft('');
    setPicked([]);
    setDismissedAt(null);
    setCaret(0);
    typingSignal.stop();

    enqueueChatMessage(user.id, {
      clientId,
      projectId,
      content,
      mentions,
      user,
      queuedAt: createdAt,
      attempts: 0,
    });
  };

  /**
   * Writes the chosen name into the draft and remembers who it was.
   *
   * The id is kept here because this is the only moment it is known: after
   * this, the draft holds a display name and nothing that distinguishes two
   * people who share one.
   */
  const pickMention = (member: RosterMember) => {
    if (!mention) return;

    const next = applyMention(draft, mention, member.displayName);
    setDraft(clampText(next.text, TEXT_LIMITS.chatMessage));
    setCaret(next.caret);
    pendingCaret.current = next.caret;
    setPicked((current) =>
      current.some((entry) => entry.id === member.id) ? current : [...current, member],
    );
  };

  /**
   * The picker's keyboard, handled from the text field so the caret never
   * leaves it.
   *
   * Every branch calls `preventDefault`, and for Enter that is doing two jobs:
   * it stops the browser's implicit form submission as well as the default key
   * behaviour. Without it, choosing a name from the list would also send the
   * half-written message it was going into.
   *
   * With the picker closed this returns immediately, so arrows, Tab and Enter
   * behave exactly as they did before any of this existed.
   */
  const handleComposerKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!isPickerOpen) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setMentionIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setMentionIndex((index) => (index - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      pickMention(suggestions[mentionIndex]);
    } else if (event.key === 'Escape') {
      // Shuts this one picker without touching the draft. A new `@` elsewhere
      // opens a new one, because the dismissal is recorded by position.
      event.preventDefault();
      setDismissedAt(mention?.start ?? null);
    }
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
      /*
       * Measured, not guessed.
       *
       * This was four literals worked out from the window being 380 wide and
       * "about 220" tall, read once during a render. All three assumptions were
       * wrong in some state: the window grows with its own content, a stored
       * offset from a large monitor survives into a small one, and
       * `window.innerWidth` changes without a render. See
       * `useViewportDragBounds`.
       */
      dragConstraints={dragBounds}
      onDragStart={measureDragBounds}
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
            : 'h-[27.5rem] sm:h-[28.75rem]',
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
            <p className="flex items-center gap-1 text-3xs text-content-faint">
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
              <p className="text-2xs text-content-faint">{t('chat.loading')}</p>
            </div>
          )}

          {!isLoadingHistory && messages.length === 0 && (
            <p className="py-8 text-center text-xs text-content-faint">
              {t('chat.empty')}
            </p>
          )}

          {/*
            Older history, on request. Only offered once there is a full page
            on screen — a conversation shorter than that is already all here.
          */}
          {hasEarlier && messages.length >= CHAT_PAGE && (
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void loadEarlier()}
                disabled={isLoadingEarlier}
                className="text-2xs"
              >
                {isLoadingEarlier ? t('chat.loadingEarlier') : t('chat.loadEarlier')}
              </Button>
            </div>
          )}

          {messages.map((message) => {
            const isMine = message.userId === user?.id;

            return (
              <div
                // The client id where there is one, so a bubble keeps its
                // element when the server's copy replaces it.
                key={message.clientId ?? message.id}
                /*
                 * `content-visibility` rather than a virtualised list: rows
                 * scrolled out of view skip layout and paint, which is the
                 * cost a long history actually has, without taking over the
                 * scroll container or measuring variable-height bubbles.
                 */
                className={cn(
                  'flex items-end gap-2 [contain-intrinsic-size:auto_3.5rem] [content-visibility:auto]',
                  isMine && 'flex-row-reverse',
                )}
              >
                <Avatar name={message.user.displayName} src={message.user.avatarUrl} size="xs" />
                <div
                  className={cn(
                    'max-w-[72%] rounded-2xl px-3 py-2 text-xs leading-relaxed',
                    isMine
                      ? 'rounded-br-corner bg-brand text-brand-contrast'
                      : 'rounded-bl-corner bg-surface-sunken text-content',
                    // A failed send is the one state that must survive being
                    // glanced at, so it changes the bubble rather than adding a
                    // detail inside it.
                    message.delivery === 'failed' && 'opacity-80 ring-1 ring-danger',
                  )}
                >
                  {!isMine && (
                    <p className="mb-0.5 text-3xs font-semibold opacity-70">
                      {message.user.displayName}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">
                    {splitMentions(message.content, roster).map((segment, index) =>
                      segment.member ? (
                        <mark
                          key={index}
                          /*
                            Three treatments, because a mention means three
                            different things depending on who is reading it.

                            Being named yourself is the only one that is
                            *information* rather than decoration — it is the
                            reason this feature exists — so it gets the full
                            accent, the one thing in the conversation drawn at
                            that weight. Somebody else being named is context,
                            and is tinted rather than filled. Inside your own
                            bubble the accent is already the background, so the
                            chip lifts out of it with the label colour instead;
                            a brand fill there would be invisible.
                          */
                          className={cn(
                            'rounded px-0.5 font-semibold',
                            isMine
                              ? 'bg-brand-contrast/25 text-brand-contrast'
                              : segment.member.id === user?.id
                                ? 'bg-brand text-brand-contrast'
                                : 'bg-brand/15 text-brand',
                          )}
                        >
                          {segment.text}
                        </mark>
                      ) : (
                        segment.text
                      ),
                    )}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-4xs opacity-60">
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
                  <button
                    type="button"
                    onClick={() => retry(message)}
                    title={t('chat.notSentHelp')}
                    aria-label={t('chat.retry')}
                    className="group/retry flex items-center rounded-full p-0.5 text-danger hover:bg-danger/10"
                  >
                    <AlertCircle className="h-3.5 w-3.5 group-hover/retry:hidden" />
                    <RotateCcw className="hidden h-3.5 w-3.5 group-hover/retry:block" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <form
          // `relative` so the mention list can hang off the top of this row.
          className="relative flex items-center gap-2 border-t border-edge p-2.5"
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
        >
          {isPickerOpen && (
            <MentionPicker
              members={suggestions}
              activeIndex={mentionIndex}
              onActiveIndexChange={setMentionIndex}
              onPick={pickMention}
            />
          )}

          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => {
              setDraft(clampText(event.target.value, TEXT_LIMITS.chatMessage));
              // Read off the event's own target rather than from a later DOM
              // read: by the time an effect could look, the value and the
              // selection have both moved on.
              setCaret(event.target.selectionStart ?? event.target.value.length);
              // Throttled and stopped on idle — see `useTypingSignal`.
              if (isConnected) typingSignal.keystroke();
            }}
            /*
             * `onSelect` fires for every caret move — clicking into the middle
             * of the draft, arrowing along it, selecting a word. Each of those
             * changes the answer to "is there an unfinished mention here", and
             * `onChange` alone would miss all of them.
             */
            onSelect={(event) =>
              setCaret(event.currentTarget.selectionStart ?? draft.length)
            }
            onKeyDown={handleComposerKeyDown}
            // Offline no longer disables the field: what is written goes into
            // the outbox and is sent on reconnect. See `send`.
            placeholder={isConnected ? t('chat.placeholder') : t('chat.offlineQueued')}
            maxLength={TEXT_LIMITS.chatMessage}
            className="field h-9 text-xs"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!draft.trim()}
            aria-label={t('chat.send')}
          >
            <SendGlyph />
          </Button>
        </form>
      </aside>
    </motion.div>
  );
};
