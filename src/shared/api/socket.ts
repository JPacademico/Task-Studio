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
    /*
     * No ceiling on the attempts, and that is the fix for a specific bug.
     *
     * It used to be 10. Ten attempts on this backoff is about a minute, after
     * which socket.io gives up *permanently* and emits `reconnect_failed` —
     * the client is then a dead object that will never try again, whatever
     * happens to the network afterwards. On a free-tier API that sleeps after
     * a quiet stretch, one minute is nothing: a tab left open over lunch
     * exhausted the budget while the container was still asleep, and the
     * "Live" pill in the header stayed grey for the rest of the session even
     * though every REST call was working.
     *
     * Giving up is never the right answer for a background connection nobody
     * is waiting on. The delay caps at 20s, so an unreachable server costs
     * three probes a minute — cheaper than the page the user is about to
     * reload out of frustration.
     */
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
 * Whether the one socket is currently connected.
 *
 * Read rather than subscribed: the reviver below needs the answer at the
 * moment the tab comes back, not a re-render when it changes.
 */
export const isSocketConnected = (): boolean => socket?.connected === true;

/**
 * Puts the socket back on its feet after the *manual* kind of disconnect.
 *
 * There are two of those, and socket.io's own reconnection covers neither:
 *
 *   - The gateway authenticates the handshake and calls `disconnect(true)` on
 *     a token it will not accept (see `handleConnection` on the API). That
 *     reaches the client as `reason === 'io server disconnect'`, which the
 *     docs are explicit about: the client does not retry it. An access token
 *     lives 15 minutes and a tab lives all day, so this is the ordinary fate
 *     of any tab left open — not an edge case.
 *   - `connect_error` with `socket.active === false`, which means the same
 *     thing at a different point in the handshake.
 *
 * Either way the token in hand is the problem, so the retry starts by
 * renewing it. Failing that — an expired refresh token, an API that is still
 * asleep — it returns false and lets the caller decide when to try again,
 * rather than hammering a server that has just said no.
 */
export const reviveSocket = async (): Promise<boolean> => {
  const instance = getSocket();
  if (instance.connected) return true;

  try {
    await refreshAccessToken();
  } catch {
    /*
     * Not fatal, and deliberately not reported.
     *
     * The refresh can fail because the session really is over — in which case
     * `client.ts` has already told the app so through `onSessionExpired` and
     * this component is about to unmount — or because the API is briefly
     * unreachable, in which case the token in hand may well still be valid.
     * Connecting anyway costs one handshake and covers the second case; the
     * first ends with the gateway refusing it, which is where we already were.
     */
  }

  instance.connect();
  return instance.connected;
};
