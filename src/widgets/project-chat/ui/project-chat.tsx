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
import {
  AlertCircle,
  Check,
  Clock3,
  GripHorizontal,
  ListChecks,
  MessageCircle,
  Pin,
  RotateCcw,
  X,
} from 'lucide-react';

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
import { useProjectThreadUnread } from '@/entities/task-comment/model/queries';
import { useCurrentUser } from '@/features/auth/model/session.store';
import { useChatDock, type ChatView } from '@/features/project-chat-dock/model/chat-dock.store';
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
import { Avatar, Button, PostItMark, SendGlyph, SkinLoader } from '@/shared/ui';
import { MentionPicker } from './mention-picker';
import { TaskThreads } from './task-threads';

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
 * The floating, draggable project chat. Dragging uses Framer Motion motion values rather than
 * dnd-kit: this window is free-floating (no drop targets, no sorting).
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

  // Which conversation is on screen: the live chat, or the task threads.
  const view = useChatDock((state) => state.view);
  const setView = useChatDock((state) => state.setView);
  const taskUnread = useProjectThreadUnread(projectId);
  /** Live-chat messages that arrived while "Tasks" was showing. */
  const [generalUnseen, setGeneralUnseen] = useState(0);

  const [draft, setDraft] = useState('');
  /** Whether "load earlier" has anything left to load. Unknown until a short page says no. */
  const [hasEarlier, setHasEarlier] = useState(true);
  const [isLoadingEarlier, setIsLoadingEarlier] = useState(false);
  // Everything the `@` picker needs, and nothing it does not. `caret` is tracked in state rather
  // than read from the DOM at use time because the mention being typed is derived during render.
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

  // History is fetched rarely and kept for a long time, because the socket is what keeps this view
  // current.
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

  // The roster, for two jobs that look unrelated and are the same one.
  const { data: roster = [] } = useRoster(projectId);

  /** The unfinished `@name` at the caret, if the reader is typing one. */
  const mention = useMemo(() => mentionQueryAt(draft, caret), [draft, caret]);

  const suggestions = useMemo(
    () => (mention ? matchMembers(roster, mention.query) : []),
    [mention, roster],
  );

  // A picker with nothing in it is not open. That is what keeps an `@` in ordinary prose — an
  // address, a handle for somewhere else, a price — from putting a popover over the conversation.
  const isPickerOpen =
    mention !== null &&
    suggestions.length > 0 &&
    mention.start !== dismissedAt &&
    // ...and the name at the caret is not already finished. Without this the picker reopens on the
    // mention it has just inserted — see `isMentionComplete`.
    !isMentionComplete(mention.query, roster);

  // A different `@`, or a different query behind the same one, is a different
  // question — so the highlighted row goes back to the best match.
  useEffect(() => {
    setMentionIndex(0);
  }, [mention?.start, mention?.query]);

  // Put the caret back after an insertion. A controlled input rewrites its own value on every
  // render, and doing so drops the selection to the end of the new text.
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

    // Into the cache, not into component state — which is what made messages survive the window
    // closing.
    const handleMessage = (message: ChatMessage) => {
      if (message.projectId !== projectId) return;
      upsertChatMessages(queryClient, projectId, [message]);
      if (message.userId !== user?.id && useChatDock.getState().view !== 'general') {
        setGeneralUnseen((count) => count + 1);
      }
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

  // The window is only ever mounted while it is open, so anything arriving here has by definition
  // been seen — counting what was missed is the closed case.
  const lastMessageKey = messages.length > 0
    ? (messages[messages.length - 1].clientId ?? messages[messages.length - 1].id)
    : null;
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [lastMessageKey]);

  // Back on the live chat: what arrived meanwhile is seen, and the newest line is in view.
  useEffect(() => {
    if (view !== 'general') return;
    setGeneralUnseen(0);
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [view]);

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
   * Draw the message first, send it second. Previously this emitted and cleared the input, and the
   * sentence did not appear until the server had written it to Postgres and fanned it back out.
   */
  const send = () => {
    const content = draft.trim();
    if (!content || !user) return;

    // See `shared/lib/uid`: `crypto.randomUUID` does not exist on an insecure
    // origin, and this line ran on every message sent.
    const clientId = uid();
    // Whoever is still named in the sentence as it stands. Not `picked` itself: that is the log of
    // every row clicked while writing, and a draft gets rewritten.
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
   * Writes the chosen name into the draft and remembers who it was. The id is kept here because
   * this is the only moment it is known.
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
   * The picker's keyboard, handled from the text field so the caret never leaves it. Every branch
   * calls `preventDefault`, and for Enter that is doing two jobs.
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
    /* A floating window on a pointer device, a sheet on a phone. The draggable window is the whole
       point of this component on a desktop. */
    <motion.div
      drag={!isTouch}
      // Only the header is a handle — see the note above.
      dragListener={false}
      dragControls={dragControls}
      dragMomentum={false}
      dragElastic={0}
      /* Measured, not guessed. This was four literals worked out from the window being 380 wide and
         "about 220" tall, read once during a render. */
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
              {typingCount > 0 && view === 'general'
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

        <ChatViewSwitch
          view={view}
          onChange={setView}
          generalUnread={generalUnseen}
          tasksUnread={taskUnread}
        />

        {view === 'tasks' ? (
          <TaskThreads projectId={projectId} />
        ) : (
          <>
            <div ref={scrollRef} className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-3 py-3">
              {/* Waiting, rather than an empty box that looks like an empty room. `isLoading` and
                  not `isPending`: the query is gated on `projectId`. */}
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
                    /* `content-visibility` rather than a virtualised list: rows scrolled out of view
                       skip layout and paint, which is the cost a long history actually has. */
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
                        // A failed send is the one state that must survive being glanced at, so it
                        // changes the bubble rather than adding a detail inside it.
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
                              /* Three treatments, because a mention means three different things
                                 depending on who is reading it. */
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
                        {/* Only our own messages carry a delivery mark, and only while there is
                            something to say about it: pending, failed. */}
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
                  // Read off the event's own target rather than from a later DOM read: by the time an
                  // effect could look, the value and the selection have both moved on.
                  setCaret(event.target.selectionStart ?? event.target.value.length);
                  // Throttled and stopped on idle — see `useTypingSignal`.
                  if (isConnected) typingSignal.keystroke();
                }}
                /* `onSelect` fires for every caret move — clicking into the middle of the draft,
                   arrowing along it, selecting a word. */
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
          </>
        )}
      </aside>
    </motion.div>
  );
};

interface ChatViewSwitchProps {
  view: ChatView;
  onChange: (view: ChatView) => void;
  generalUnread: number;
  tasksUnread: number;
}

/** "General" and "Tasks": two halves of one strip, the active one lifted onto a sliding plate. */
const ChatViewSwitch = ({ view, onChange, generalUnread, tasksUnread }: ChatViewSwitchProps) => {
  const t = useT();
  const options = [
    { value: 'general' as const, label: t('chat.general'), icon: MessageCircle, unread: generalUnread },
    { value: 'tasks' as const, label: t('chat.tasks'), icon: ListChecks, unread: tasksUnread },
  ];

  return (
    <div
      role="tablist"
      aria-label={t('chat.viewsLabel')}
      className="grid grid-cols-2 gap-1 border-b border-edge bg-surface-sunken/60 p-1.5"
    >
      {options.map((option) => {
        const isActive = view === option.value;
        const Icon = option.icon;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative flex h-8 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold',
              'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
              isActive ? 'text-brand-contrast' : 'text-content-muted hover:text-content',
            )}
          >
            {isActive && (
              <motion.span
                layoutId="chat-view-plate"
                aria-hidden
                className="absolute inset-0 rounded-xl bg-brand shadow-[0_4px_12px_-6px_rgb(var(--brand)/0.8)]"
                transition={{ type: 'spring', stiffness: 520, damping: 38 }}
              />
            )}
            <Icon className="relative h-3.5 w-3.5" aria-hidden />
            <span className="relative">{option.label}</span>
            {option.unread > 0 && (
              <span
                className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-amber-400 drop-shadow-[0_2px_3px_rgb(0_0_0/0.35)]"
                title={t('chat.unreadCount', { count: String(option.unread) })}
              >
                <PostItMark count={option.unread} className="h-[1.125rem] w-[1.125rem]" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
