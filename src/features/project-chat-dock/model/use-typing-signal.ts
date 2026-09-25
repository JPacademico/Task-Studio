import { useCallback, useEffect, useRef } from 'react';

import { useRealtime } from '@/app/providers/realtime-provider';

/**
 * At most one "typing" frame this often while the keys keep coming.
 *
 * It used to be one frame per keystroke — a fast typist is eight a second, to
 * every socket in the room, each one a state update on every receiving screen
 * for a badge that only ever says "somebody is typing". The receiver keeps the
 * badge up for a little longer than this (`TYPING_VISIBLE_MS`), so a throttled
 * stream still reads as continuous.
 */
const TYPING_EVERY_MS = 2_000;

/** Quiet this long and the badge is taken down on purpose, not left to expire. */
const TYPING_IDLE_MS = 3_000;

/** How long a receiver shows the badge after the last frame. */
export const TYPING_VISIBLE_MS = 4_000;

/**
 * The composer's half of the typing indicator: throttled while typing, an
 * explicit stop on idle and on send.
 */
export const useTypingSignal = (projectId: string) => {
  const { socket } = useRealtime();
  const lastSent = useRef(0);
  const idleTimer = useRef<number | undefined>(undefined);

  const stop = useCallback(() => {
    window.clearTimeout(idleTimer.current);
    idleTimer.current = undefined;
    if (lastSent.current === 0) return;

    lastSent.current = 0;
    socket?.emit('chat:typing', { projectId, isTyping: false });
  }, [projectId, socket]);

  const keystroke = useCallback(() => {
    const now = Date.now();
    if (now - lastSent.current >= TYPING_EVERY_MS) {
      lastSent.current = now;
      socket?.emit('chat:typing', { projectId, isTyping: true });
    }

    window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(stop, TYPING_IDLE_MS);
  }, [projectId, socket, stop]);

  // Leaving the conversation mid-sentence is stopping, as far as anybody
  // watching the badge can tell.
  useEffect(() => stop, [stop]);

  return { keystroke, stop };
};
