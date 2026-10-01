import { io, type Socket } from 'socket.io-client';

import { env } from '@/shared/config/env';
import { refreshAccessToken } from './client';
import { tokenStore } from './token-store';

let socket: Socket | null = null;

/**
 * One socket for the whole app. Rooms (`user:*`, `project:*`) do the routing,
 * so a second connection would only double the free-tier instance's load.
 */
export const getSocket = (): Socket => {
  if (socket) return socket;

  socket = io(env.socketUrl, {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    withCredentials: true,
    // Re-read the token on every (re)connect: it rotates every 15 minutes.
    auth: (cb) => cb({ token: tokenStore.getAccessToken() ?? '' }),
    // No ceiling on the attempts, and that is the fix for a specific bug. It used to be 10. Ten
    // attempts on this backoff is about a minute, after.
    reconnectionAttempts: Number.POSITIVE_INFINITY,
    reconnectionDelay: 800,
    reconnectionDelayMax: 20_000,
    // Full jitter on the backoff, so a thousand tabs coming back from a
    // deploy do not all knock at the same moment.
    randomizationFactor: 0.5,
  });

  return socket;
};

export const connectSocket = (): Socket => {
  const instance = getSocket();
  if (!instance.connected) instance.connect();
  return instance;
};

export const disconnectSocket = (): void => {
  socket?.disconnect();
  socket = null;
};

/** Promise-wrapped emit for handlers that acknowledge. */
export const emitWithAck = <T>(event: string, payload: unknown, timeoutMs = 8_000): Promise<T> =>
  new Promise((resolve, reject) => {
    const instance = getSocket();
    if (!instance.connected) {
      reject(new Error('Realtime connection is offline.'));
      return;
    }

    instance.timeout(timeoutMs).emit(event, payload, (error: unknown, response: T) => {
      if (error) reject(error instanceof Error ? error : new Error('Realtime request timed out.'));
      else resolve(response);
    });
  });

/**
 * Whether the one socket is currently connected. Read rather than subscribed: the reviver below
 * needs the answer at the moment the tab comes back, not a re-render when it changes.
 */
export const isSocketConnected = (): boolean => socket?.connected === true;

/** Puts the socket back on its feet after the *manual* kind of disconnect. */
export const reviveSocket = async (): Promise<boolean> => {
  const instance = getSocket();
  if (instance.connected) return true;

  try {
    await refreshAccessToken();
  } catch {
    // Not fatal, and deliberately not reported.
  }

  instance.connect();
  return instance.connected;
};
