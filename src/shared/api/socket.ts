import { io, type Socket } from 'socket.io-client';

import { env } from '@/shared/config/env';
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
    reconnectionAttempts: 10,
    reconnectionDelay: 800,
    reconnectionDelayMax: 8_000,
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
