import { useEffect, useRef, type RefObject } from 'react';

import { useRealtime } from '@/app/providers/realtime-provider';
import { useCurrentUser } from '@/features/auth/model/session.store';
import { peerColor } from '../lib/peer-color';

/**
 * How long a pointer is drawn after its last update.
 *
 * Long enough to survive a tab being briefly busy, short enough that somebody
 * who closed their laptop does not leave a pointer sitting on the board. It is
 * deliberately not tied to presence: a colleague can be *in* the project and
 * not have the board open, and drawing their pointer at wherever it last was
 * would be a lie about where they are looking.
 */
const CURSOR_TTL_MS = 6_000;

/** How often the stale ones are reaped. Cheap: a walk of at most a few entries. */
const SWEEP_MS = 2_000;

interface PresenceCursorsProps {
  projectId: string;
  /** The board surface. Coordinates are normalised against its box. */
  surfaceRef: RefObject<HTMLElement | null>;
  /** Display names, so a pointer can say whose it is. */
  names: Record<string, string>;
  /** Off while a dialog or another panel owns the pointer. */
  enabled?: boolean;
}

interface Cursor {
  node: HTMLDivElement;
  seenAt: number;
}

/**
 * Everybody else's pointer, on the shared board.
 *
 * ## Why this component touches React exactly once
 *
 * It renders one empty `<div>` and never re-renders. Every pointer inside it is
 * a DOM node this component creates, positions and removes by hand.
 *
 * That is not premature optimisation, it is the requirement. A cursor layer
 * that held positions in state would call `setState` at the rate other people
 * move their mice — five colleagues at 60Hz is three hundred renders a second
 * — and React would reconcile a subtree on every one of them. On a board that
 * also has a canvas, a connector layer and a few hundred Post-its on it, that
 * is the single most expensive thing this screen could be made to do, and it
 * would be spent entirely on redrawing dots.
 *
 * Writing `transform` on a node the component already owns costs one style
 * recalculation on one composited element. There is no reconciliation, nothing
 * upstream re-renders, and the board does not know this is happening.
 *
 * ## Why it subscribes to the socket itself
 *
 * Same reason. Routing pointers through `useBoardPresence` and down as props
 * would put them back on the render path the moment anything upstream turned
 * them into state — and this is the one piece of board presence with no
 * consumer other than itself. Locks are the opposite case and are state,
 * because notes draw them.
 *
 * ## Why the coordinates are normalised
 *
 * The board is a scroll container whose *content* is the same size for
 * everybody (notes are at absolute positions) but whose *viewport* is whatever
 * each person's window is. Sending client pixels would put a colleague's
 * pointer somewhere else entirely on a narrower screen. Fractions of the
 * surface's own box survive that, and they are what `whiteboard:cursor`
 * already carried.
 */
export const PresenceCursors = ({
  projectId,
  surfaceRef,
  names,
  enabled = true,
}: PresenceCursorsProps) => {
  const { socket, isConnected } = useRealtime();
  const currentUser = useCurrentUser();
  const layerRef = useRef<HTMLDivElement>(null);
  const cursors = useRef(new Map<string, Cursor>());

  /*
   * Read through a ref, so a colleague joining the project — which rewrites
   * `names` — does not tear down the socket subscription and lose every
   * pointer currently on screen.
   */
  const namesRef = useRef(names);
  namesRef.current = names;

  // --- Receiving -----------------------------------------------------------

  useEffect(() => {
    if (!socket || !isConnected || !projectId || !enabled) return;

    const layer = layerRef.current;
    if (!layer) return;

    const live = cursors.current;

    const ensure = (userId: string): Cursor => {
      const existing = live.get(userId);
      if (existing) return existing;

      const color = peerColor(userId);
      const node = document.createElement('div');
      node.className = 'board-cursor';
      node.style.setProperty('--board-cursor-ink', color);
      /*
       * The arrow and the label are one `innerHTML` assignment rather than
       * six `createElement` calls, and it is safe because nothing in it comes
       * from a user: the colour is derived from a uuid and the name is set
       * through `textContent` immediately below.
       */
      node.innerHTML =
        '<svg viewBox="0 0 16 16" aria-hidden="true">' +
        // A pointer, drawn as the one shape everybody already reads as one:
        // a filled arrowhead with a tail, outlined so it stays visible over a
        // Post-it of any colour.
        '<path d="M2 1.4 13.2 7.6 8.1 8.6 6.2 13.6Z" />' +
        '</svg>' +
        '<span class="board-cursor__name"></span>';

      const label = node.querySelector<HTMLSpanElement>('.board-cursor__name');
      if (label) label.textContent = namesRef.current[userId] ?? '';

      layer.appendChild(node);
      const cursor: Cursor = { node, seenAt: Date.now() };
      live.set(userId, cursor);
      return cursor;
    };

    const onCursor = (payload: {
      projectId: string;
      userId: string;
      x: number;
      y: number;
    }) => {
      if (payload.projectId !== projectId) return;
      // The gateway excludes the sender, but the same account in another tab
      // is another socket — and watching your own pointer lag behind itself is
      // worse than not seeing it at all.
      if (payload.userId === currentUser?.id) return;

      const cursor = ensure(payload.userId);
      cursor.seenAt = Date.now();
      /*
       * Percentages rather than pixels, so the node needs no knowledge of the
       * surface's measured size and nothing has to be recomputed when the
       * board is resized or the stage goes full screen. `translate` on top of
       * that is what puts the arrow's point — rather than its box's corner —
       * under the reported position.
       */
      cursor.node.style.left = `${payload.x * 100}%`;
      cursor.node.style.top = `${payload.y * 100}%`;
      cursor.node.style.opacity = '1';
    };

    socket.on('whiteboard:cursor', onCursor);

    /*
     * Reaping, on a timer rather than per frame.
     *
     * A pointer that has stopped arriving is somebody who closed the tab,
     * switched away, or lost their connection, and none of those send a
     * goodbye. Two seconds of granularity on a six-second lifetime is
     * imperceptible and costs one walk of a map with at most a handful of
     * entries in it.
     */
    const sweeper = window.setInterval(() => {
      const now = Date.now();
      for (const [userId, cursor] of live) {
        if (now - cursor.seenAt <= CURSOR_TTL_MS) continue;
        cursor.node.remove();
        live.delete(userId);
      }
    }, SWEEP_MS);

    return () => {
      socket.off('whiteboard:cursor', onCursor);
      window.clearInterval(sweeper);
      for (const cursor of live.values()) cursor.node.remove();
      live.clear();
    };
  }, [currentUser?.id, enabled, isConnected, projectId, socket]);

  /*
   * Names arriving late.
   *
   * The roster is a separate query from the socket, so a pointer routinely
   * appears before the name behind it does — and a label that stayed empty
   * until the next pointer move would be blank for as long as somebody held
   * still. This patches the existing nodes in place rather than rebuilding
   * them, so nothing flickers.
   */
  useEffect(() => {
    for (const [userId, cursor] of cursors.current) {
      const label = cursor.node.querySelector<HTMLSpanElement>('.board-cursor__name');
      if (label) label.textContent = names[userId] ?? '';
    }
  }, [names]);

  // --- Sending -------------------------------------------------------------

  useEffect(() => {
    if (!socket || !isConnected || !projectId || !enabled) return;

    const surface = surfaceRef.current;
    if (!surface) return;

    let frame = 0;
    let pending: { x: number; y: number } | null = null;

    const flush = () => {
      frame = 0;
      if (!pending) return;
      socket.emit('whiteboard:cursor', { projectId, x: pending.x, y: pending.y });
      pending = null;
    };

    const onMove = (event: PointerEvent) => {
      const box = surface.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return;

      /*
       * Clamped, so a pointer that has left the surface is reported at its
       * edge rather than at a fraction outside it. The alternative — dropping
       * the frame — leaves a colleague's arrow frozen wherever it happened to
       * cross the border, which reads as a stuck cursor rather than as
       * somebody having moved away.
       */
      pending = {
        x: Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)),
        y: Math.min(1, Math.max(0, (event.clientY - box.top) / box.height)),
      };

      // One frame is exactly the rate at which a move becomes visible, and it
      // self-adjusts on a display that is not 60Hz. See `publishDrag`.
      if (!frame) frame = requestAnimationFrame(flush);
    };

    /*
     * On the surface rather than on `window`, so moving the mouse over the
     * chat panel or the rail does not broadcast a position that means nothing
     * on the board. `passive` because nothing here calls `preventDefault` and
     * a non-passive pointer listener on a scroll container is a scroll-jank
     * warning waiting to happen.
     */
    surface.addEventListener('pointermove', onMove, { passive: true });

    return () => {
      surface.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [enabled, isConnected, projectId, socket, surfaceRef]);

  /*
   * `inset-0` and `pointer-events-none`: this layer covers the whole board and
   * must never be a target between the reader and a Post-it. `z-30` puts it
   * above the notes, because a pointer is the one thing that is *in front of*
   * the paper rather than on it.
   */
  return (
    <div
      ref={layerRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
    />
  );
};
