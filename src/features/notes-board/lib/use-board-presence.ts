import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useRealtime } from '@/app/providers/realtime-provider';
import { isPendingNoteId } from '@/entities/note/lib/optimistic';
import { useCurrentUser } from '@/features/auth/model/session.store';
import { createThrottledFlush, roundPx } from './live-rate';

/**
 * How often a holder re-asserts a hold it still has.
 *
 * A third of the server's `BOARD_LOCK_TTL_MS`, so three heartbeats have to be
 * lost before somebody can take an object out from under a person still using
 * it. Any keepalive wants that ratio for the same reason: one dropped frame on
 * a bad connection must not be indistinguishable from a dead tab.
 */
const HEARTBEAT_MS = 15_000;

/**
 * The most points one `board:ink` frame may carry — the API's `BoardInkDto`
 * cap. A frame is a thirtieth of a second of decimated samples, which is far
 * below this; the chunking in `publishInk` is for a stalled timer catching up.
 */
const INK_POINTS_PER_FRAME = 64;

/**
 * How long a teammate's ghost stroke survives without news.
 *
 * `GHOST_IDLE_MS` is for a stroke still being drawn: a sender that stops
 * sending without ever saying `done` closed its tab or lost its connection
 * mid-line, and nothing else will ever remove what it left behind. Before this
 * the ghost stayed painted on everybody's board until they reloaded.
 *
 * `GHOST_SETTLE_MS` is for a stroke that has finished: it is kept on screen
 * until the saved version arrives to replace it (see `settleInk`), and this is
 * the ceiling on that wait — long enough for a slow database write, short
 * enough that a stroke the server refused does not linger as if it had been
 * kept.
 */
const GHOST_IDLE_MS = 5_000;
const GHOST_SETTLE_MS = 2_500;
const GHOST_SWEEP_MS = 1_000;

/**
 * A live stroke arriving from somebody else, accumulated by `strokeId`.
 *
 * Shaped to match `WhiteboardStrokeData` so a board can paint it with exactly
 * the same code path it paints committed ink with — the whole point is that a
 * colleague's stroke in progress should look like ink, not like a preview of
 * ink.
 */
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
   * The whiteboard page on screen. Live ink is stamped with it on the way out
   * and filtered by it on the way in — a teammate drawing on page 3 must not
   * paint ghost strokes across page 1.
   */
  pageIndex?: number;
  /**
   * Moves one note on screen without a render, on behalf of a remote dragger.
   *
   * A callback rather than state returned from here, because the only correct
   * destination for these coordinates is the note's own Framer motion values —
   * see `applyRemoteDrag` in the board. Returning them as state would put
   * sixty renders a second of the entire wall in the path of somebody else's
   * pointer, which is precisely what the local drag path was built to avoid.
   */
  onRemoteDrag: (noteId: string, x: number, y: number) => void;
  /** Called whenever the set of in-progress remote strokes changes. */
  onRemoteInk: (strokes: RemoteStroke[]) => void;
}

/**
 * Who is holding what on a shared board, and what their hands are doing.
 *
 * ## The problem this exists for
 *
 * The project board is the one surface in the product where two people
 * routinely reach for the same object at the same moment, and until now
 * nothing mediated that. Two people dragging one Post-it each wrote their own
 * final position through the debounced batch endpoint and the later request
 * won — silently, with the loser watching the sheet jump somewhere they did
 * not put it. Two people typing in one note interleaved their keystrokes.
 * Neither produced an error; both produced a board that had quietly lost
 * somebody's work.
 *
 * ## Why locks and not a CRDT
 *
 * A CRDT (or an OT server) solves *merging* concurrent edits to one value.
 * That is the right tool when concurrent edits are the normal case and have to
 * succeed — a shared text document, where two people typing in different
 * paragraphs must both land.
 *
 * It is the wrong tool here, and expensive in a way that is easy to
 * underestimate: a CRDT means every note's position and text become a
 * versioned structure rather than a column, the API stops being REST over rows
 * and becomes an update log, and the board's undo stack — which today is a
 * stack of closures that reverse a mutation — has to be rebuilt against
 * document versions. Weeks of work, a new class of bug, and a migration.
 *
 * And it would be solving a problem this surface does not have. A Post-it is a
 * physical metaphor and the physical answer is already the correct one: *you
 * cannot pick up a sheet somebody else is holding*. Nobody expects to be able
 * to. So the cheap thing and the right thing agree — refuse the second grab
 * instead of merging it — and the entire mechanism is one map on the server
 * and this hook on the client. Nothing is written, nothing is versioned,
 * nothing survives a restart. See `LIVE_BOARD.md` for the full comparison.
 *
 * ## What is *not* locked
 *
 * Ink. Two people can draw over each other on a real whiteboard, strokes are
 * append-only, and there is no object to contend — so live ink is pure
 * broadcast with no hold and no acknowledgement.
 *
 * ## Why the lock table is React state while everything else is a ref
 *
 * Because it is the only part of this a note actually *draws*. Holds change a
 * few times a minute; drags and cursors change sixty times a second. The rule
 * in this file is the same one `use-live-call` uses: if a re-render on change
 * would be wrong or wasteful, it is a ref.
 */
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
   * What this client still *wants*, including requests whose answer has not
   * arrived yet.
   *
   * ## The leak this closes
   *
   * `release` used to consult `heldRef` alone, and a note only enters that set
   * when the server's grant arrives. A click shorter than the round trip — a
   * pointer down and up inside fifty milliseconds, which is an ordinary click
   * on an ordinary connection — released *before* the grant, found nothing to
   * release and sent nothing; then the grant landed, the note went into
   * `heldRef`, and the heartbeat re-asserted it every fifteen seconds from
   * then on. The sheet showed as held by this person, on everybody else's
   * board, until this tab closed.
   *
   * Now a release withdraws the want, and a grant that arrives for something
   * no longer wanted is handed straight back.
   */
  const wantedRef = useRef(new Set<string>());

  /*
   * Read through refs so the socket effect below can depend on the connection
   * and nothing else.
   *
   * Both callbacks come from the board and are recreated whenever its notes
   * change, which on a live wall is constantly. Listing them as dependencies
   * would tear down and re-register every `board:*` listener each time —
   * dropping frames mid-drag, and re-requesting the lock table on every note
   * anybody edits.
   */
  const onRemoteDragRef = useRef(onRemoteDrag);
  onRemoteDragRef.current = onRemoteDrag;
  const onRemoteInkRef = useRef(onRemoteInk);
  onRemoteInkRef.current = onRemoteInk;

  /**
   * In-progress strokes from other people, keyed by stroke id.
   *
   * A ref with an explicit notification rather than state, because a stroke
   * grows by a handful of points per frame and the consumer repaints a canvas
   * imperatively — putting it in React state would re-render the board on
   * every frame of somebody else's pen.
   */
  const remoteStrokes = useRef(new Map<string, Ghost>());

  const notifyInk = useCallback(() => {
    onRemoteInkRef.current([...remoteStrokes.current.values()]);
  }, []);

  /**
   * The saved version of a stroke has arrived; its ghost can go.
   *
   * ## Why the ghost is not dropped on `done`
   *
   * It was, and every finished stroke blinked on everybody else's board. `done`
   * is relayed the instant the pointer lifts, while the saved element is
   * broadcast only after its row is written — so between the two, for however
   * long the insert took, the stroke was on nobody's layer at all. The ghost
   * now stays until the element that replaces it is actually here, matched by
   * the stroke id the author sends as `clientId` (see `whiteboard:draw` on the
   * API).
   */
  const settleInk = useCallback(
    (strokeId: string | null | undefined) => {
      if (!strokeId || !remoteStrokes.current.delete(strokeId)) return;
      notifyInk();
    },
    [notifyInk],
  );

  // ---------------------------------------------------------------------------
  // Listening
  // ---------------------------------------------------------------------------

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
      /*
       * Our own echo is impossible here — the gateway uses `client.to(...)`,
       * which excludes the sender — but the same account in a second tab is
       * not the same socket, and applying its drag would fight the local
       * gesture. The hold is per socket on the server for exactly this reason,
       * so a note this tab is holding is one nobody else may move.
       */
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
        /*
         * Finished — but kept on screen until the saved element replaces it
         * (see `settleInk`), unless it is too short to have been saved at all.
         *
         * The author discards anything under two points, so a ghost that
         * short will never be replaced, and it paints nothing either; waiting
         * out `GHOST_SETTLE_MS` for it would only hold a dead entry in the map.
         */
        if (ghost.points.length < 2) remoteStrokes.current.delete(payload.strokeId);
        else ghost.isDone = true;
      }

      notifyInk();
    };

    /*
     * Somebody left mid-stroke. Their ghosts go with them rather than waiting
     * out the idle timeout, which is the difference between a line that
     * vanishes when its author's tab closes and one that lingers five seconds
     * after they have visibly gone.
     */
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

    /*
     * Reaping, on a timer rather than per frame — the same shape as the
     * pointer layer's sweeper, and for the same reason: nothing sends a
     * goodbye when a laptop lid closes. See `GHOST_IDLE_MS`.
     */
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

    /*
     * What is already held, asked for once on arrival.
     *
     * Broadcasts this client was not present for are gone, so without this a
     * newcomer sees a wall with nothing held and can grab a note out from
     * under a colleague who has been dragging it for ten seconds — the exact
     * race the locks exist to prevent, reintroduced by arriving late.
     *
     * Acknowledged rather than broadcast, because the answer is for one
     * client and telling the whole room would be N-1 wasted deliveries every
     * time anybody opened the board.
     */
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

      // Nothing will ever finish or reap these once the listeners are gone —
      // a dropped connection would otherwise freeze every half-drawn line on
      // screen until it came back.
      if (remoteStrokes.current.size > 0) {
        remoteStrokes.current.clear();
        notifyInk();
      }
    };
    // `pageIndex` too: changing page tears the listeners down, and the teardown
    // above clears the old page's ghosts on the way.
  }, [isConnected, notifyInk, pageIndex, projectId, socket]);

  // ---------------------------------------------------------------------------
  // Holding
  // ---------------------------------------------------------------------------

  /**
   * Ask for exclusive hold of one object.
   *
   * ## Why this is awaited when almost nothing else here is
   *
   * Because the answer can be *no*, and a caller that proceeded anyway would
   * be doing the thing the lock exists to stop. It is the one round trip on
   * this surface — one map lookup on the server, no database — and it is paid
   * once per gesture rather than per frame.
   *
   * The caller covers the latency rather than waiting on it: a drag begins
   * locally and is cancelled if the answer comes back refused. Freezing every
   * gesture for a round trip to avoid a rare snap-back would make the common
   * case worse to fix the uncommon one.
   *
   * ## Why a disconnected board grants by default
   *
   * Offline, nobody else can be holding anything *that this client will ever
   * hear about*, and refusing every gesture would make a board with a dropped
   * socket completely inert — which is a far worse failure than the
   * last-write-wins behaviour this had before locks existed at all. The server
   * is still the authority the moment the socket returns.
   */
  const acquire = useCallback(
    async (noteId: string): Promise<boolean> => {
      if (heldRef.current.has(noteId)) return true;
      if (!socket || !isConnected) return true;

      wantedRef.current.add(noteId);

      const answer = await new Promise<{ granted: boolean; byServer: boolean }>((resolve) => {
        /*
         * A timeout, because a promise that never settles is a gesture that
         * never starts. Two seconds is far longer than this round trip takes
         * and short enough that a stalled socket does not look like a frozen
         * board; the fallback is the same "grant it" as being offline, for the
         * same reason.
         */
        const timer = window.setTimeout(() => resolve({ granted: true, byServer: false }), 2_000);
        socket.emit(
          'board:lock',
          { projectId, noteId },
          (response?: { granted?: boolean; userId?: string }) => {
            window.clearTimeout(timer);
            /*
             * Only a refusal that names a holder is a refusal.
             *
             * The API also answers `{ granted: false }` with nobody attached
             * when it could not decide at all — the socket has not rejoined
             * the project room yet after a reconnect, or its lock allowance is
             * spent. Neither means somebody else has the note, and treating
             * them as if it did snapped sheets out of people's hands for a
             * server-side technicality. They get the same answer as a timeout
             * or a dropped socket: go ahead, locally. See `LIVE_BOARD.md` §4.
             */
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

  /*
   * Re-assert everything still held, every fifteen seconds.
   *
   * A drag never lasts long enough to need this; an edit routinely does —
   * somebody typing a paragraph into a Post-it holds it for minutes. Without a
   * heartbeat the server's TTL would hand their note to somebody else
   * mid-sentence.
   *
   * One interval for the whole set rather than one per note: a board where
   * somebody has grabbed six sheets at once would otherwise be six timers
   * firing at six unrelated moments.
   */
  useEffect(() => {
    if (!socket || !isConnected) return;

    const timer = window.setInterval(() => {
      for (const noteId of heldRef.current) {
        socket.emit('board:lock', { projectId, noteId });
      }
    }, HEARTBEAT_MS);

    return () => window.clearInterval(timer);
  }, [isConnected, projectId, socket]);

  /*
   * Let go of everything on the way out.
   *
   * The server releases a socket's holds on disconnect and on `project:leave`,
   * so this is not the only defence — but neither of those fires when the
   * board simply unmounts (navigating to another tab of the same project,
   * collapsing the full-screen stage) and the socket stays open. Without it, a
   * note somebody was typing in stays locked for everybody else until the TTL
   * expires it.
   *
   * The dependency list is empty on purpose: this must run when the component
   * goes, not whenever `release` is rebuilt — which happens on every
   * reconnect.
   */
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

  // ---------------------------------------------------------------------------
  // Publishing
  // ---------------------------------------------------------------------------

  /*
   * The connection as the outgoing streams see it, read at flush time.
   *
   * The throttles below are created once and outlive any single connection,
   * so they must not close over one — a flush scheduled just before a
   * reconnect would otherwise emit on the socket that has since gone.
   */
  const wireRef = useRef({ socket, isConnected, projectId, pageIndex });
  wireRef.current = { socket, isConnected, projectId, pageIndex };

  /**
   * Where a note is being dragged to, at `LIVE_FRAME_MS`.
   *
   * ## Why a fixed rate and not one animation frame
   *
   * It was one animation frame, which is the sender's refresh rate — 144 frames
   * a second on some monitors — and every frame is five deliveries on a board
   * of six. The server metered it well below that, so most frames were being
   * thrown away on arrival anyway; now they are simply not sent. Receivers
   * glide between frames over the same interval (`applyRemoteDrag`), which is
   * what makes 30 look like 60. See `live-rate.ts`.
   *
   * ## Why the *latest* position is kept rather than every one
   *
   * These are absolute coordinates, not deltas, so an intermediate frame that
   * is never sent is not lost information — the next one supersedes it
   * completely. The throttle's trailing edge is what guarantees the one that
   * matters most, where the sheet stopped, always goes.
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
      // A picture still uploading exists on this screen only — nobody else
      // has a sheet to move, and the API refuses a drag of an id that is not
      // a row's.
      if (isPendingNoteId(noteId)) return;
      pendingDrag.current.set(noteId, { x, y });
      dragStream.request();
    },
    [dragStream, isConnected, socket],
  );

  /**
   * Strokes in progress, batched to `LIVE_FRAME_MS`.
   *
   * The board hands over the points it kept from every pointer event; they are
   * held here and sent as one frame per interval rather than one per event.
   * Only the *new* points travel — see `BoardInkDto` on the API for why
   * re-sending the whole stroke each frame is quadratic in its own length.
   *
   * Unlike a drag, nothing here can be dropped: a frame is a run of the line,
   * not a position, so a lost one is a gap. Batching is what makes that safe —
   * the old per-event emits ran several times past the server's allowance and
   * the refusals were exactly those gaps.
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
   * Who is holding this note, or null — and never this client's own hold.
   *
   * The distinction is the whole interface: a hold by somebody else is a
   * reason to refuse a gesture and draw a warning, and a hold by *me* is the
   * ordinary state of a note I am currently using. Returning the second would
   * put a "locked by you" ribbon on every sheet anybody touched.
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
