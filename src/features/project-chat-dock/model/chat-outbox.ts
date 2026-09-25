import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useRealtime } from '@/app/providers/realtime-provider';
import {
  confirmLocalMessage,
  setLocalDelivery,
  upsertChatMessages,
} from '@/entities/chat/model/chat-cache';
import type { ChatMessage } from '@/entities/chat/model/types';
import type { UserSummary } from '@/entities/user/model/types';
import { useCurrentUser } from '@/features/auth/model/session.store';
import { emitWithAck } from '@/shared/api/socket';

/**
 * Messages that have been written but not yet acknowledged, kept on disk.
 *
 * ## Why every send goes through here, online or not
 *
 * Sending used to be one emit with a pending tick, and anything that went
 * wrong — a dropped socket, a timeout, the rate limit — left a red "not sent"
 * bubble and nothing else; the composer was disabled outright while offline.
 * Now a send is an entry in this queue, and the queue is drained in order
 * whenever the socket is up: immediately in the ordinary case, and on
 * reconnect after a train tunnel. Entries survive a reload because they are
 * persisted, and a resend is safe because the API writes each `clientId` once
 * (see `ChatService.send`).
 *
 * ## Why it is per account
 *
 * A queue restored from disk is sent as whoever is signed in *now*. Keyed by
 * user, somebody signing out and a colleague signing in on the same machine
 * can never post the first person's unsent sentence under the second name.
 */
export interface OutboxEntry {
  clientId: string;
  projectId: string;
  content: string;
  mentions: string[];
  /** The bubble's author, so a queue restored after a reload can draw it. */
  user: UserSummary;
  queuedAt: string;
  attempts: number;
}

/**
 * Tries before an entry is given up on and shown as failed.
 *
 * A timeout is retried (the socket may be half-dead), but a message the
 * gateway refuses outright never acknowledges at all, so an unbounded retry
 * would resend a doomed message forever. Five spans a minute or so of backoff.
 */
const MAX_ATTEMPTS = 5;
const RETRY_BASE_MS = 1_500;

const storageKey = (userId: string) => `task-studio:chat-outbox:${userId}`;

const read = (userId: string): OutboxEntry[] => {
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as OutboxEntry[]) : [];
  } catch {
    return [];
  }
};

const write = (userId: string, entries: OutboxEntry[]) => {
  try {
    if (entries.length === 0) window.localStorage.removeItem(storageKey(userId));
    else window.localStorage.setItem(storageKey(userId), JSON.stringify(entries));
  } catch {
    // Private mode, a full disk: the queue still works for this tab's life.
  }
};

/*
 * In memory as well as on disk, so a tab whose storage is unavailable still
 * has a queue, and so the drain loop is not parsing JSON on every step.
 */
const queues = new Map<string, OutboxEntry[]>();
const listeners = new Set<() => void>();

const queueOf = (userId: string): OutboxEntry[] => {
  let queue = queues.get(userId);
  if (!queue) {
    queue = read(userId);
    queues.set(userId, queue);
  }
  return queue;
};

const save = (userId: string, entries: OutboxEntry[]) => {
  queues.set(userId, entries);
  write(userId, entries);
  for (const listener of listeners) listener();
};

export const enqueueChatMessage = (userId: string, entry: OutboxEntry): void => {
  // Only the four fields a bubble draws: this goes to disk, and a signed-in
  // profile carries more than a chat bubble needs to remember.
  const { id, displayName, email, avatarUrl } = entry.user;
  const stored = { ...entry, user: { id, displayName, email, avatarUrl } };
  save(userId, [...queueOf(userId).filter((item) => item.clientId !== entry.clientId), stored]);
};

/** The unsent messages for one conversation, drawn as pending bubbles. */
export const pendingOutboxMessages = (userId: string, projectId: string): ChatMessage[] =>
  queueOf(userId)
    .filter((entry) => entry.projectId === projectId)
    .map((entry) => ({
      id: `local:${entry.clientId}`,
      clientId: entry.clientId,
      content: entry.content,
      mentions: entry.mentions,
      createdAt: entry.queuedAt,
      editedAt: null,
      deletedAt: null,
      projectId: entry.projectId,
      userId: entry.user.id,
      user: entry.user,
      delivery: 'pending',
    }));

const remove = (userId: string, clientId: string) =>
  save(
    userId,
    queueOf(userId).filter((entry) => entry.clientId !== clientId),
  );

const bump = (userId: string, clientId: string) =>
  save(
    userId,
    queueOf(userId).map((entry) =>
      entry.clientId === clientId ? { ...entry, attempts: entry.attempts + 1 } : entry,
    ),
  );

interface SendAck {
  delivered?: boolean;
  rateLimited?: boolean;
  messageId?: string;
}

/**
 * Drains the queue while the socket is up. Mounted once, by the chat dock.
 *
 * One entry at a time and in order, so a burst typed offline arrives in the
 * order it was written. A failure stops the drain and schedules the next try
 * with a growing wait; a reconnect starts one straight away.
 */
export const useChatOutbox = (): void => {
  const { socket, isConnected } = useRealtime();
  const userId = useCurrentUser()?.id;
  const queryClient = useQueryClient();
  const retryTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!socket || !isConnected || !userId) return;
    let isStopped = false;
    /*
     * Per connection rather than a ref: a drain from a connection that has
     * since dropped must not stop the new connection's drain from starting.
     * If the two overlap on one entry, the API writes its `clientId` once.
     */
    const draining = { current: false };

    const scheduleRetry = (attempts: number) => {
      window.clearTimeout(retryTimer.current);
      retryTimer.current = window.setTimeout(
        () => void drain(),
        RETRY_BASE_MS * 2 ** Math.min(attempts, 4),
      );
    };

    const drain = async () => {
      if (draining.current || isStopped) return;
      draining.current = true;

      try {
        while (!isStopped) {
          const [entry] = queueOf(userId);
          if (!entry) return;

          let ack: SendAck | undefined;
          try {
            ack = await emitWithAck<SendAck>('chat:send', {
              projectId: entry.projectId,
              content: entry.content,
              clientId: entry.clientId,
              ...(entry.mentions.length > 0 ? { mentions: entry.mentions } : {}),
            });
          } catch {
            ack = undefined;
          }

          if (ack?.delivered) {
            remove(userId, entry.clientId);
            if (ack.messageId) {
              confirmLocalMessage(queryClient, entry.projectId, entry.clientId, ack.messageId);
            } else {
              setLocalDelivery(queryClient, entry.projectId, entry.clientId, undefined);
            }
            continue;
          }

          if (entry.attempts + 1 >= MAX_ATTEMPTS) {
            // Out of the queue and onto the screen as failed; the bubble's own
            // retry puts it back with a fresh count.
            remove(userId, entry.clientId);
            setLocalDelivery(queryClient, entry.projectId, entry.clientId, 'failed');
            continue;
          }

          bump(userId, entry.clientId);
          scheduleRetry(entry.attempts + 1);
          return;
        }
      } finally {
        draining.current = false;
      }
    };

    /*
     * A queue restored from disk after a reload has bubbles nobody has drawn
     * yet: put them into their conversations so they show as "sending".
     */
    const restored = queueOf(userId);
    const byProject = new Map<string, true>();
    for (const entry of restored) byProject.set(entry.projectId, true);
    for (const projectId of byProject.keys()) {
      upsertChatMessages(queryClient, projectId, pendingOutboxMessages(userId, projectId));
    }

    const onChange = () => void drain();
    listeners.add(onChange);
    void drain();

    return () => {
      isStopped = true;
      listeners.delete(onChange);
      window.clearTimeout(retryTimer.current);
    };
  }, [isConnected, queryClient, socket, userId]);
};
