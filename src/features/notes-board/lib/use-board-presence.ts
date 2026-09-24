import { useCallback, useEffect, useRef, useState } from 'react';

import { useRealtime } from '@/app/providers/realtime-provider';
import { useCurrentUser } from '@/features/auth/model/session.store';

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

interface UseBoardPresenceOptions {
  projectId: string;
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
  onRemoteDrag,
  onRemoteInk,
}: UseBoardPresenceOptions) => {
  const { socket, isConnected } = useRealtime();
  const currentUser = useCurrentUser();

  /** `noteId -> userId`. Everything on the board that somebody is holding. */
  const [locks, setLocks] = useState<Record<string, string>>({});

  /** What *this* socket holds, so the heartbeat knows what to re-assert. */
  const heldRef = useRef(new Set<string>());

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
  const remoteStrokes = useRef(new Map<string, RemoteStroke>());

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
    }) => {
      if (payload.projectId !== projectId) return;

      if (payload.done) {
        /*
         * The ghost is dropped, and the real stroke takes its place.
         *
         * `whiteboard:draw`'s own broadcast arrives at about the same moment
         * carrying the persisted element, which the board appends to its
         * committed list. Dropping this one is what stops the stroke being
         * painted twice — once as a ghost and once for real — which on an
         * eraser stroke is visible, because two `destination-out` passes rub
         * out twice as much.
         */
        remoteStrokes.current.delete(payload.strokeId);
      } else {
        const existing = remoteStrokes.current.get(payload.strokeId);
        if (existing) {
          existing.points.push(...payload.points);
        } else {
          remoteStrokes.current.set(payload.strokeId, {
            strokeId: payload.strokeId,
            userId: payload.userId,
            points: [...payload.points],
            color: payload.color,
            width: payload.width,
            erase: payload.erase,
          });
        }
      }

      onRemoteInkRef.current([...remoteStrokes.current.values()]);
    };

    socket.on('board:locked', onLocked);
    socket.on('board:unlocked', onUnlocked);
    socket.on('board:drag', onDrag);
    socket.on('board:ink', onInk);

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
    };
  }, [isConnected, projectId, socket]);

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

      const granted = await new Promise<boolean>((resolve) => {
        /*
         * A timeout, because a promise that never settles is a gesture that
         * never starts. Two seconds is far longer than this round trip takes
         * and short enough that a stalled socket does not look like a frozen
         * board; the fallback is the same "grant it" as being offline, for the
         * same reason.
         */
        const timer = window.setTimeout(() => resolve(true), 2_000);
        socket.emit(
          'board:lock',
          { projectId, noteId },
          (response?: { granted?: boolean }) => {
            window.clearTimeout(timer);
            resolve(response?.granted ?? true);
          },
        );
      });

      if (granted) heldRef.current.add(noteId);
      return granted;
    },
    [isConnected, projectId, socket],
  );

  const release = useCallback(
    (noteId: string) => {
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
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Publishing
  // ---------------------------------------------------------------------------

  /**
   * Where a note is being dragged to, coalesced to one frame.
   *
   * ## Why the throttle is a frame and not a fixed millisecond count
   *
   * A pointer reports faster than the screen refreshes, so anything more often
   * than once per frame is information nobody can see — and on a mesh of six
   * people it is five deliveries each. `requestAnimationFrame` is exactly the
   * rate at which a change becomes visible, and it self-adjusts on a display
   * that is not 60Hz.
   *
   * ## Why the *latest* position is kept rather than every one
   *
   * These are absolute coordinates, not deltas, so an intermediate frame that
   * is never sent is not lost information — the next one supersedes it
   * completely. That is also what makes the server's silent rate limit safe:
   * a dropped frame costs nothing because the one 16ms behind it is already
   * correct.
   */
  const pendingDrag = useRef(new Map<string, { x: number; y: number }>());
  const dragFrame = useRef(0);

  const publishDrag = useCallback(
    (noteId: string, x: number, y: number) => {
      if (!socket || !isConnected) return;

      pendingDrag.current.set(noteId, { x, y });
      if (dragFrame.current) return;

      dragFrame.current = requestAnimationFrame(() => {
        dragFrame.current = 0;
        for (const [id, point] of pendingDrag.current) {
          socket.emit('board:drag', { projectId, noteId: id, x: point.x, y: point.y });
        }
        pendingDrag.current.clear();
      });
    },
    [isConnected, projectId, socket],
  );

  useEffect(
    () => () => {
      if (dragFrame.current) cancelAnimationFrame(dragFrame.current);
    },
    [],
  );

  /**
   * A stroke in progress, as points are added to it.
   *
   * Only the *new* points travel — see `BoardInkDto` on the API for why
   * re-sending the whole stroke each frame is quadratic in its own length.
   */
  const publishInk = useCallback(
    (stroke: {
      strokeId: string;
      points: [number, number][];
      color: string;
      width: number;
      erase?: boolean;
      done?: boolean;
    }) => {
      if (!socket || !isConnected) return;
      socket.emit('board:ink', { projectId, ...stroke });
    },
    [isConnected, projectId, socket],
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

  return { locks, acquire, release, publishDrag, publishInk, lockedBy };
};
