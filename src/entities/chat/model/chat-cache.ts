import type { QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/shared/api/query-keys';
import { chatApi } from '../api/chat.api';
import type { ChatDelivery, ChatMessage } from './types';

/**
 * One conversation, held in the query cache and nowhere else.
 *
 * ## The bug this replaced
 *
 * The window used to keep two lists: the history it fetched (cached for five
 * minutes) and a `liveMessages` array in component state for everything that
 * arrived or was sent while it was open. Closing the window unmounted the
 * component and threw the second list away; reopening it inside those five
 * minutes drew the cached history without refetching — so every message
 * exchanged during the last open simply vanished, both sides' alike, until
 * the cache happened to expire.
 *
 * Now there is one list, it lives in the cache (which outlives the window),
 * and every writer — the socket, the composer, the outbox — writes to it.
 * Reopening shows it instantly and then catches up with only what was missed
 * (`after`), because events that arrived while the window was shut and the
 * project room was left were never delivered at all.
 */

/** A page of history. The first open asks for this many, "load earlier" too. */
export const CHAT_PAGE = 50;

/**
 * The most a reopened window catches up on in one request.
 *
 * Past this there may be a gap between what is cached and what came back, and
 * a list with a hole in the middle is worse than a shorter one — so the cache
 * is replaced by the latest page instead.
 */
const CATCH_UP_LIMIT = 100;

const isLocal = (message: ChatMessage) => message.id.startsWith('local:');

/** `(createdAt, id)` — the same total order the API pages by. */
const byTime = (a: ChatMessage, b: ChatMessage) => {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
};

/**
 * Two versions of a conversation, as one.
 *
 * Confirmed messages are keyed by server id, and the incoming copy wins — it
 * may carry a later edit. A local bubble is retired the moment a confirmed
 * message with its `clientId` exists. Local bubbles always sort *after* the
 * confirmed ones: their timestamps come from this machine's clock, and a
 * clock a minute slow would otherwise file a message just sent above the
 * conversation it is answering.
 */
export const mergeMessages = (current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] => {
  const confirmed = new Map<string, ChatMessage>();
  const local = new Map<string, ChatMessage>();

  for (const message of [...current, ...incoming]) {
    if (isLocal(message)) {
      if (message.clientId) local.set(message.clientId, message);
    } else {
      confirmed.set(message.id, message);
    }
  }

  const settled = new Set<string>();
  for (const message of confirmed.values()) {
    if (message.clientId) settled.add(message.clientId);
  }

  return [
    ...[...confirmed.values()].sort(byTime),
    ...[...local.values()].filter((message) => !settled.has(message.clientId ?? '')).sort(byTime),
  ];
};

/*
 * Which conversations have a real baseline in the cache.
 *
 * A socket message for a conversation nobody has opened must not *create* its
 * cache entry: a list holding one message looks like a complete conversation,
 * and the catch-up below would then ask only for what came after it — never
 * for the history before. Those arrivals are parked instead, and folded in by
 * the fetch that establishes the baseline.
 */
const seeded = new Set<string>();
const parked = new Map<string, ChatMessage[]>();

const keyOf = (projectId: string) => queryKeys.chat.history(projectId);

/** Put messages into a conversation, wherever they came from. */
export const upsertChatMessages = (
  queryClient: QueryClient,
  projectId: string,
  messages: ChatMessage[],
): void => {
  if (messages.length === 0) return;

  const current = queryClient.getQueryData<ChatMessage[]>(keyOf(projectId));
  if (!current || !seeded.has(projectId)) {
    const waiting = parked.get(projectId) ?? [];
    parked.set(projectId, [...waiting, ...messages].slice(-CATCH_UP_LIMIT));
    // A bubble the reader just typed still has to show, even before the
    // first fetch lands; the fetch merges it rather than replacing it.
    if (current) queryClient.setQueryData(keyOf(projectId), mergeMessages(current, messages));
    return;
  }

  queryClient.setQueryData(keyOf(projectId), mergeMessages(current, messages));
};

/** Change one of our own bubbles, found by the id we minted for it. */
export const updateLocalMessage = (
  queryClient: QueryClient,
  projectId: string,
  clientId: string,
  update: (message: ChatMessage) => ChatMessage,
): void => {
  queryClient.setQueryData<ChatMessage[]>(keyOf(projectId), (current) =>
    current?.map((message) =>
      message.clientId === clientId && isLocal(message) ? update(message) : message,
    ),
  );

  const waiting = parked.get(projectId);
  if (waiting) {
    parked.set(
      projectId,
      waiting.map((message) =>
        message.clientId === clientId && isLocal(message) ? update(message) : message,
      ),
    );
  }
};

export const setLocalDelivery = (
  queryClient: QueryClient,
  projectId: string,
  clientId: string,
  delivery: ChatDelivery | undefined,
): void => updateLocalMessage(queryClient, projectId, clientId, (message) => ({ ...message, delivery }));

/**
 * The server has the message; the room may not have told us yet.
 *
 * The broadcast only reaches sockets in the project's room, and the outbox
 * can deliver while the window is shut and the room has been left. So the
 * acknowledgement's own id turns the bubble into a confirmed message here —
 * otherwise it would sit on "sending" until the next refetch.
 */
export const confirmLocalMessage = (
  queryClient: QueryClient,
  projectId: string,
  clientId: string,
  messageId: string,
): void => {
  const current = queryClient.getQueryData<ChatMessage[]>(keyOf(projectId));
  const bubble = current?.find((message) => message.clientId === clientId && isLocal(message));
  if (!current || !bubble) return;

  queryClient.setQueryData(
    keyOf(projectId),
    mergeMessages(
      current.filter((message) => message !== bubble),
      [{ ...bubble, id: messageId, delivery: undefined }],
    ),
  );
};

/**
 * The query function for a conversation.
 *
 * First load: the latest page. Every load after that: only what came after
 * the newest confirmed message already here — a reopened window is instant
 * and costs one small request. The cache is read again *after* the network
 * answers, so a bubble typed while the request was in flight survives it.
 */
export const loadConversation = async (
  queryClient: QueryClient,
  projectId: string,
): Promise<ChatMessage[]> => {
  const before = queryClient.getQueryData<ChatMessage[]>(keyOf(projectId)) ?? [];
  const newest = seeded.has(projectId)
    ? [...before].reverse().find((message) => !isLocal(message))
    : undefined;

  let fresh: ChatMessage[];
  /** Whether what is cached can be kept, or only its unsent bubbles can. */
  let isContinuous = true;

  if (newest) {
    fresh = await chatApi.history(projectId, { after: newest.id, limit: CATCH_UP_LIMIT });
    // A full page means there may be more behind it than one request covers:
    // start again from the latest page rather than leave a hole.
    if (fresh.length >= CATCH_UP_LIMIT) {
      fresh = await chatApi.history(projectId, { limit: CHAT_PAGE });
      isContinuous = false;
    }
  } else {
    fresh = await chatApi.history(projectId, { limit: CHAT_PAGE });
  }

  // Read again now: whatever the socket or the composer wrote while the
  // request was out is in here, and must survive it.
  const now = queryClient.getQueryData<ChatMessage[]>(keyOf(projectId)) ?? [];
  const base = isContinuous ? now : now.filter(isLocal);
  const waiting = parked.get(projectId) ?? [];
  parked.delete(projectId);
  seeded.add(projectId);

  return mergeMessages(base, [...waiting, ...fresh]);
};

/**
 * Older messages, prepended.
 *
 * Returns how many arrived, so the caller knows whether there is anything
 * further back — a short page is the start of the conversation.
 */
export const loadEarlierMessages = async (
  queryClient: QueryClient,
  projectId: string,
): Promise<number> => {
  const current = queryClient.getQueryData<ChatMessage[]>(keyOf(projectId)) ?? [];
  const oldest = current.find((message) => !isLocal(message));
  if (!oldest) return 0;

  const older = await chatApi.history(projectId, { before: oldest.id, limit: CHAT_PAGE });
  if (older.length > 0) {
    queryClient.setQueryData<ChatMessage[]>(keyOf(projectId), (latest) =>
      mergeMessages(latest ?? [], older),
    );
  }
  return older.length;
};
