import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useRealtime } from '@/app/providers/realtime-provider';
import { isPendingNoteId } from '@/entities/note/lib/optimistic';
import { useCurrentUser } from '@/features/auth/model/session.store';
import { createThrottledFlush, roundPx } from './live-rate';

/**
 * How often a holder re-asserts a hold it still has. A third of the server's `BOARD_LOCK_TTL_MS`.
 */
const HEARTBEAT_MS = 15_000;

/**
 * The most points one `board:ink` frame may carry — the API's `BoardInkDto` cap. A frame is a
 * thirtieth of a second of decimated samples.
 */
const INK_POINTS_PER_FRAME = 64;

/**
 * How long a teammate's ghost stroke survives without news. `GHOST_IDLE_MS` is for a stroke still
 * being drawn.
 */
const GHOST_IDLE_MS = 5_000;
const GHOST_SETTLE_MS = 2_500;
const GHOST_SWEEP_MS = 1_000;

/** A live stroke arriving from somebody else, accumulated by `strokeId`. */
export interface RemoteStroke {
  strokeId: string;
  userId: string;
  points: [number, number][];
  color: string;
  width: number;
  erase: boolean;
}

/** A ghost plus the bookkeeping that decides when it goes. Never leaves this hook. */
interface Ghost extends RemoteStroke {
  seenAt: number;
  isDone: boolean;
}

/** One stroke's points waiting for the next outgoing ink frame. */
interface PendingInk {
  strokeId: string;
  points: [number, number][];
  color: string;
  width: number;
  erase?: boolean;
  done?: boolean;
}

interface UseBoardPresenceOptions {
  projectId: string;
  /**
   * The whiteboard page on screen. Live ink is stamped with it on the way out and filtered by it on
   * the way in — a teammate drawing on page 3 must not paint ghost strokes across page 1.
   */
  pageIndex?: number;
  /**
   * Moves one note on screen without a render, on behalf of a remote dragger. A callback rather
   * than state returned from here.
   */
  onRemoteDrag: (noteId: string, x: number, y: number) => void;
  /** Called whenever the set of in-progress remote strokes changes. */
  onRemoteInk: (strokes: RemoteStroke[]) => void;
}

/** Who is holding what on a shared board, and what their hands are doing. */
export const useBoardPresence = ({
  projectId,
  pageIndex = 0,
  onRemoteDrag,
  onRemoteInk,
}: UseBoardPresenceOptions) => {
  const { socket, isConnected } = useRealtime();
  const currentUser = useCurrentUser();

  /** `noteId -> userId`. Everything on the board that somebody is holding. */
  const [locks, setLocks] = useState<Record<string, string>>({});

  /** What *this* socket holds, so the heartbeat knows what to re-assert. */
  const heldRef = useRef(new Set<string>());

  /**
   * What this client still *wants*, including requests whose answer has not arrived yet. `release`
   * used to consult `heldRef` alone.
   */
  const wantedRef = useRef(new Set<string>());

  // Read through refs so the socket effect below can depend on the connection and nothing else.
  // Both callbacks come from the board and are recreated whenever its notes change.
  const onRemoteDragRef = useRef(onRemoteDrag);
  onRemoteDragRef.current = onRemoteDrag;
  const onRemoteInkRef = useRef(onRemoteInk);
  onRemoteInkRef.current = onRemoteInk;

  /**
   * In-progress strokes from other people, keyed by stroke id. A ref with an explicit notification
   * rather than state.
   */
  const remoteStrokes = useRef(new Map<string, Ghost>());

  const notifyInk = useCallback(() => {
    onRemoteInkRef.current([...remoteStrokes.current.values()]);
  }, []);

  /**
   * The saved version of a stroke has arrived; its ghost can go. It was, and every finished stroke
   * blinked on everybody else's board.
   */
  const settleInk = useCallback(
    (strokeId: string | null | undefined) => {
      if (!strokeId || !remoteStrokes.current.delete(strokeId)) return;
      notifyInk();
    },
    [notifyInk],
  );

  // --- Listening ---------------------------------------------------------------

  useEffect(() => {
    if (!socket || !isConnected || !projectId) return;

    const onLocked = (payload: { projectId: string; noteId: string; userId: string }) => {
      if (payload.projectId !== projectId) return;
      setLocks((current) =>
        current[payload.noteId] === payload.userId
          ? current
          : { ...current, [payload.noteId]: payload.userId },
      );
    };

    const onUnlocked = (payload: { projectId: string; noteId: string }) => {
      if (payload.projectId !== projectId) return;
      setLocks((current) => {
        if (!(payload.noteId in current)) return current;
        const next = { ...current };
        delete next[payload.noteId];
        return next;
      });
    };

    const onDrag = (payload: {
      projectId: string;
      userId: string;
      noteId: string;
      x: number;
      y: number;
    }) => {
      if (payload.projectId !== projectId) return;
      // Our own echo is impossible here — the gateway uses `client.to(...)`, which excludes the
      // sender — but the same account in a second tab is not the same socket.
      if (heldRef.current.has(payload.noteId)) return;
      onRemoteDragRef.current(payload.noteId, payload.x, payload.y);
    };

    const onInk = (payload: {
      projectId: string;
      userId: string;
      strokeId: string;
      points: [number, number][];
      color: string;
      width: number;
      erase: boolean;
      done: boolean;
      pageIndex?: number;
    }) => {
      if (payload.projectId !== projectId) return;
      if ((payload.pageIndex ?? 0) !== pageIndex) return;

      const now = Date.now();
      let ghost = remoteStrokes.current.get(payload.strokeId);

      if (ghost) {
        ghost.points.push(...payload.points);
        ghost.seenAt = now;
      } else if (!payload.done || payload.points.length > 0) {
        ghost = {
          strokeId: payload.strokeId,
          userId: payload.userId,
          points: [...payload.points],
          color: payload.color,
          width: payload.width,
          erase: payload.erase,
          seenAt: now,
          isDone: false,
        };
        remoteStrokes.current.set(payload.strokeId, ghost);
      }

      if (ghost && payload.done) {
        // Finished — but kept on screen until the saved element replaces it (see `settleInk`),
        // unless it is too short to have been saved at all.
        if (ghost.points.length < 2) remoteStrokes.current.delete(payload.strokeId);
        else ghost.isDone = true;
      }

      notifyInk();
    };

    // Somebody left mid-stroke. Their ghosts go with them rather than waiting out the idle timeout.
    const onLeft = (payload: { projectId: string; userId: string }) => {
      if (payload.projectId !== projectId) return;
      let changed = false;
      for (const [strokeId, ghost] of remoteStrokes.current) {
        if (ghost.userId !== payload.userId) continue;
        remoteStrokes.current.delete(strokeId);
        changed = true;
      }
      if (changed) notifyInk();
    };

    socket.on('board:locked', onLocked);
    socket.on('board:unlocked', onUnlocked);
    socket.on('board:drag', onDrag);
    socket.on('board:ink', onInk);
    socket.on('presence:left', onLeft);

    // Reaping, on a timer rather than per frame — the same shape as the pointer layer's sweeper,
    // and for the same reason: nothing sends a goodbye when a laptop lid closes.
    const sweeper = window.setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [strokeId, ghost] of remoteStrokes.current) {
        const limit = ghost.isDone ? GHOST_SETTLE_MS : GHOST_IDLE_MS;
        if (now - ghost.seenAt <= limit) continue;
        remoteStrokes.current.delete(strokeId);
        changed = true;
      }
      if (changed) notifyInk();
    }, GHOST_SWEEP_MS);

    // What is already held, asked for once on arrival. Broadcasts this client was not present for
    // are gone.
    socket.emit(
      'board:locks',
      { projectId },
      (response?: { locks?: { noteId: string; userId: string }[] }) => {
        const incoming = response?.locks;
        if (!incoming?.length) return;
        setLocks((current) => {
          const next = { ...current };
          for (const entry of incoming) next[entry.noteId] = entry.userId;
          return next;
        });
      },
    );

    return () => {
      socket.off('board:locked', onLocked);
      socket.off('board:unlocked', onUnlocked);
      socket.off('board:drag', onDrag);
      socket.off('board:ink', onInk);
      socket.off('presence:left', onLeft);
      window.clearInterval(sweeper);

      // Nothing will ever finish or reap these once the listeners are gone — a dropped connection
      // would otherwise freeze every half-drawn line on screen until it came back.
      if (remoteStrokes.current.size > 0) {
        remoteStrokes.current.clear();
        notifyInk();
      }
    };
    // `pageIndex` too: changing page tears the listeners down, and the teardown
    // above clears the old page's ghosts on the way.
  }, [isConnected, notifyInk, pageIndex, projectId, socket]);

  // --- Holding -----------------------------------------------------------------

  /** Ask for exclusive hold of one object. */
  const acquire = useCallback(
    async (noteId: string): Promise<boolean> => {
      if (heldRef.current.has(noteId)) return true;
      if (!socket || !isConnected) return true;

      wantedRef.current.add(noteId);

      const answer = await new Promise<{ granted: boolean; byServer: boolean }>((resolve) => {
        // A timeout, because a promise that never settles is a gesture that never starts.
        const timer = window.setTimeout(() => resolve({ granted: true, byServer: false }), 2_000);
        socket.emit(
          'board:lock',
          { projectId, noteId },
          (response?: { granted?: boolean; userId?: string }) => {
            window.clearTimeout(timer);
            // Only a refusal that names a holder is a refusal. The API also answers `{ granted:
            // false }` with nobody attached when it could not decide at all.
            const isContended = response?.granted === false && Boolean(response.userId);
            resolve({ granted: !isContended, byServer: response?.granted === true });
          },
        );
      });

      // Let go before the answer arrived — see `wantedRef`.
      if (!wantedRef.current.has(noteId)) {
        if (answer.byServer) socket.emit('board:unlock', { projectId, noteId });
        return false;
      }

      if (answer.granted) heldRef.current.add(noteId);
      else wantedRef.current.delete(noteId);
      return answer.granted;
    },
    [isConnected, projectId, socket],
  );

  const release = useCallback(
    (noteId: string) => {
      wantedRef.current.delete(noteId);
      if (!heldRef.current.delete(noteId)) return;
      socket?.emit('board:unlock', { projectId, noteId });
    },
    [projectId, socket],
  );

  // Re-assert everything still held, every fifteen seconds. A drag never lasts long enough to need
  // this; an edit routinely does — somebody typing a paragraph into a Post-it holds it for minutes.
  useEffect(() => {
    if (!socket || !isConnected) return;

    const timer = window.setInterval(() => {
      for (const noteId of heldRef.current) {
        socket.emit('board:lock', { projectId, noteId });
      }
    }, HEARTBEAT_MS);

    return () => window.clearInterval(timer);
  }, [isConnected, projectId, socket]);

  // Let go of everything on the way out. The server releases a socket's holds on disconnect and on
  // `project:leave`, so this is not the only defence.
  const releaseRef = useRef(release);
  releaseRef.current = release;

  useEffect(
    () => () => {
      for (const noteId of [...heldRef.current]) releaseRef.current(noteId);
      // And anything still in flight: its grant is handed straight back.
      wantedRef.current.clear();
    },
    [],
  );

  // --- Publishing --------------------------------------------------------------

  // The connection as the outgoing streams see it, read at flush time. The throttles below are
  // created once and outlive any single connection, so they must not close over one.
  const wireRef = useRef({ socket, isConnected, projectId, pageIndex });
  wireRef.current = { socket, isConnected, projectId, pageIndex };

  /**
   * Where a note is being dragged to, at `LIVE_FRAME_MS`. It was one animation frame, which is the
   * sender's refresh rate — 144 frames a second on some monitors.
   */
  const pendingDrag = useRef(new Map<string, { x: number; y: number }>());

  const dragStream = useMemo(
    () =>
      createThrottledFlush(() => {
        const wire = wireRef.current;
        if (wire.socket && wire.isConnected) {
          for (const [noteId, point] of pendingDrag.current) {
            wire.socket.emit('board:drag', {
              projectId: wire.projectId,
              noteId,
              x: roundPx(point.x),
              y: roundPx(point.y),
            });
          }
        }
        pendingDrag.current.clear();
      }),
    [],
  );

  const publishDrag = useCallback(
    (noteId: string, x: number, y: number) => {
      if (!socket || !isConnected) return;
      // A picture still uploading exists on this screen only — nobody else has a sheet to move, and
      // the API refuses a drag of an id that is not a row's.
      if (isPendingNoteId(noteId)) return;
      pendingDrag.current.set(noteId, { x, y });
      dragStream.request();
    },
    [dragStream, isConnected, socket],
  );

  /**
   * Strokes in progress, batched to `LIVE_FRAME_MS`. The board hands over the points it kept from
   * every pointer event.
   */
  const pendingInk = useRef(new Map<string, PendingInk>());

  const inkStream = useMemo(
    () =>
      createThrottledFlush(() => {
        const wire = wireRef.current;
        if (wire.socket && wire.isConnected) {
          for (const frame of pendingInk.current.values()) {
            // Chunked to the API's per-frame cap. In practice one chunk; a
            // background tab's slowed timer is the only way to get more.
            let offset = 0;
            do {
              const points = frame.points.slice(offset, offset + INK_POINTS_PER_FRAME);
              offset += INK_POINTS_PER_FRAME;
              const isLast = offset >= frame.points.length;
              wire.socket.emit('board:ink', {
                projectId: wire.projectId,
                pageIndex: wire.pageIndex,
                strokeId: frame.strokeId,
                points,
                color: frame.color,
                width: frame.width,
                ...(frame.erase ? { erase: true } : {}),
                ...(frame.done && isLast ? { done: true } : {}),
              });
            } while (offset < frame.points.length);
          }
        }
        pendingInk.current.clear();
      }),
    [],
  );

  const publishInk = useCallback(
    (stroke: PendingInk) => {
      if (!socket || !isConnected) return;

      const pending = pendingInk.current.get(stroke.strokeId);
      if (pending) {
        pending.points.push(...stroke.points);
        pending.done = pending.done || stroke.done;
      } else {
        pendingInk.current.set(stroke.strokeId, { ...stroke, points: [...stroke.points] });
      }

      // The last frame of a stroke goes now: it is what lets everybody else
      // stop expecting more, and there is nothing behind it to batch with.
      if (stroke.done) inkStream.flushNow();
      else inkStream.request();
    },
    [inkStream, isConnected, socket],
  );

  useEffect(
    () => () => {
      dragStream.cancel();
      inkStream.cancel();
    },
    [dragStream, inkStream],
  );

  /**
   * Who is holding this note, or null — and never this client's own hold. The distinction is the
   * whole interface: a hold by somebody else is a reason to refuse a gesture and draw a warning.
   */
  const lockedBy = useCallback(
    (noteId: string): string | null => {
      const holder = locks[noteId];
      if (!holder || holder === currentUser?.id) return null;
      return holder;
    },
    [currentUser?.id, locks],
  );

  return { locks, acquire, release, publishDrag, publishInk, settleInk, lockedBy };
};
