import { useEffect, useRef, type CSSProperties, type RefObject } from 'react';

import { useRealtime } from '@/app/providers/realtime-provider';
import { useCurrentUser } from '@/features/auth/model/session.store';
import { createThrottledFlush, LIVE_FRAME_MS } from '../lib/live-rate';
import { peerColor } from '../lib/peer-color';

/**
 * How long a pointer is drawn after its last update. Long enough to survive a tab being briefly
 * busy.
 */
const CURSOR_TTL_MS = 6_000;

/** How often the stale ones are reaped. Cheap: a walk of at most a few entries. */
const SWEEP_MS = 2_000;

interface PresenceCursorsProps {
  projectId: string;
  /** The page on screen: pointers on other pages are not drawn here. */
  pageIndex?: number;
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
  /** Where the pointer is, as fractions of the surface. Kept so a resize can re-place it. */
  x: number;
  y: number;
}

const clampUnit = (value: number) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);

/**
 * Everybody else's pointer, on the shared board. It renders one empty `<div>` and never re-renders.
 * Every pointer inside it is a DOM node this component creates, positions and removes by hand.
 */
export const PresenceCursors = ({
  projectId,
  pageIndex = 0,
  surfaceRef,
  names,
  enabled = true,
}: PresenceCursorsProps) => {
  const { socket, isConnected } = useRealtime();
  const currentUser = useCurrentUser();
  const layerRef = useRef<HTMLDivElement>(null);
  const cursors = useRef(new Map<string, Cursor>());

  // Read through a ref, so a colleague joining the project — which rewrites `names` — does not tear
  // down the socket subscription and lose every pointer currently on screen.
  const namesRef = useRef(names);
  namesRef.current = names;

  // --- Receiving -----------------------------------------------------------

  useEffect(() => {
    if (!socket || !isConnected || !projectId || !enabled) return;

    const layer = layerRef.current;
    if (!layer) return;

    const live = cursors.current;

    // The layer's size, measured when it changes rather than on every position.
    const size = { width: layer.clientWidth, height: layer.clientHeight };

    const place = (cursor: Cursor) => {
      // -2px so the arrow's point, not its box's corner, sits on the position.
      cursor.node.style.transform = `translate3d(${cursor.x * size.width - 2}px, ${
        cursor.y * size.height - 2
      }px, 0)`;
    };

    const resizer = new ResizeObserver(() => {
      size.width = layer.clientWidth;
      size.height = layer.clientHeight;
      for (const cursor of live.values()) place(cursor);
    });
    resizer.observe(layer);

    const ensure = (userId: string, x: number, y: number): Cursor => {
      const existing = live.get(userId);
      if (existing) return existing;

      const color = peerColor(userId);
      const node = document.createElement('div');
      node.className = 'board-cursor';
      node.style.setProperty('--board-cursor-ink', color);
      // The arrow and the label are one `innerHTML` assignment rather than six `createElement`
      // calls, and it is safe because nothing in it comes from a user.
      node.innerHTML =
        '<svg viewBox="0 0 16 16" aria-hidden="true">' +
        // A pointer, drawn as the one shape everybody already reads as one: a filled arrowhead with
        // a tail, outlined so it stays visible over a Post-it of any colour.
        '<path d="M2 1.4 13.2 7.6 8.1 8.6 6.2 13.6Z" />' +
        '</svg>' +
        '<span class="board-cursor__name"></span>';

      const label = node.querySelector<HTMLSpanElement>('.board-cursor__name');
      if (label) label.textContent = namesRef.current[userId] ?? '';

      const cursor: Cursor = { node, seenAt: Date.now(), x, y };
      // Placed before it is attached, so its first appearance is where the
      // colleague actually is — not a glide in from the corner.
      place(cursor);
      layer.appendChild(node);
      live.set(userId, cursor);
      return cursor;
    };

    const onCursor = (payload: {
      projectId: string;
      userId: string;
      x: number;
      y: number;
      pageIndex?: number;
    }) => {
      if (payload.projectId !== projectId) return;
      // A pointer on another page is somebody who has moved away from this one: their arrow comes
      // down now rather than hanging where they left it until the sweeper notices.
      if ((payload.pageIndex ?? 0) !== pageIndex) {
        const gone = live.get(payload.userId);
        if (gone) {
          gone.node.remove();
          live.delete(payload.userId);
        }
        return;
      }
      // The gateway excludes the sender, but the same account in another tab is another socket —
      // and watching your own pointer lag behind itself is worse than not seeing it at all.
      if (payload.userId === currentUser?.id) return;

      const x = clampUnit(payload.x);
      const y = clampUnit(payload.y);
      const cursor = ensure(payload.userId, x, y);
      cursor.seenAt = Date.now();
      cursor.x = x;
      cursor.y = y;
      place(cursor);
      cursor.node.style.opacity = '1';
    };

    socket.on('whiteboard:cursor', onCursor);

    // Reaping, on a timer rather than per frame. A pointer that has stopped arriving is somebody
    // who closed the tab, switched away, or lost their connection.
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
      resizer.disconnect();
      for (const cursor of live.values()) cursor.node.remove();
      live.clear();
    };
  }, [currentUser?.id, enabled, isConnected, pageIndex, projectId, socket]);

  // Names arriving late. The roster is a separate query from the socket, so a pointer routinely
  // appears before the name behind it does.
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

    let pending: { clientX: number; clientY: number } | null = null;

    // At `LIVE_FRAME_MS`, and measured at send time. The surface's box used to be read on every
    // `pointermove`, which a high-rate mouse delivers several times per frame.
    const stream = createThrottledFlush(() => {
      if (!pending) return;
      const box = surface.getBoundingClientRect();
      const point = pending;
      pending = null;
      if (box.width === 0 || box.height === 0) return;

      // Clamped, so a pointer that has left the surface is reported at its edge rather than at a
      // fraction outside it.
      const x = Math.min(1, Math.max(0, (point.clientX - box.left) / box.width));
      const y = Math.min(1, Math.max(0, (point.clientY - box.top) / box.height));
      socket.emit('whiteboard:cursor', {
        projectId,
        pageIndex,
        x: Math.round(x * 10_000) / 10_000,
        y: Math.round(y * 10_000) / 10_000,
      });
    });

    const onMove = (event: PointerEvent) => {
      pending = { clientX: event.clientX, clientY: event.clientY };
      stream.request();
    };

    // On the surface rather than on `window`, so moving the mouse over the chat panel or the rail
    // does not broadcast a position that means nothing on the board.
    surface.addEventListener('pointermove', onMove, { passive: true });

    return () => {
      surface.removeEventListener('pointermove', onMove);
      stream.cancel();
    };
  }, [enabled, isConnected, pageIndex, projectId, socket, surfaceRef]);

  // `inset-0` and `pointer-events-none`: this layer covers the whole board and must never be a
  // target between the reader and a Post-it.
  return (
    <div
      ref={layerRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
      // The glide is one send interval long — see the note on the component.
      style={{ '--board-cursor-glide': `${LIVE_FRAME_MS}ms` } as CSSProperties}
    />
  );
};
