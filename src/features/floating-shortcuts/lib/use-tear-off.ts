import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Below this the gesture was a click on the row, not a drag out of the rail.
 *
 * Small on purpose. The old value asked for 14px of travel before anything
 * appeared, which on a menu row reads as "nothing is happening" and is most of
 * why the gesture felt like it needed a run-up. Six pixels is past the wobble
 * of a normal click and under the distance a deliberate drag covers instantly.
 */
const THRESHOLD = 6;

interface TearOffOptions {
  /** Off on touch, where a long press already means something else. */
  enabled?: boolean;
  /** Fired on release, with the drop point in viewport coordinates. */
  onTearOff: (point: { x: number; y: number }) => void;
}

/**
 * Drag a row out of a menu, in one press.
 *
 * Deliberately not Framer Motion's `drag`: the rows live inside a scrolling
 * `overflow-y-auto` column, so an element that moved with the pointer would be
 * sliced off at the edge of its own scroll container the moment it left. This
 * hook never moves the row — it tracks the pointer and hands back a position
 * for a ghost the caller paints in a portal, which is free to be anywhere on
 * screen.
 *
 * Three things make press-and-drag actually work first time, all of which the
 * rows need because they are anchors:
 *
 *   - `draggable={false}` plus a swallowed `dragstart`. A link is natively
 *     draggable, so pressing one and moving hands the gesture to the browser's
 *     own drag-and-drop, which immediately fires `pointercancel` at us and
 *     tears down the tracking. That is the whole reason the rail used to want
 *     a double-click first: the second press of a double-click lands inside
 *     the browser's own suppression window, so the native drag never starts
 *     and ours survives.
 *   - Pointer capture, so the events keep arriving even once the pointer has
 *     left the rail — which it does immediately, since the point is to drop
 *     the copy somewhere else entirely.
 *   - A swallowed click on release, so a drag does not also navigate.
 */
export const useTearOff = ({ enabled = true, onTearOff }: TearOffOptions) => {
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const suppressClickRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  // A rail can unmount mid-gesture (the pointer left, the panel slid away).
  useEffect(() => () => cleanupRef.current?.(), []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (!enabled || event.button !== 0) return;

      const start = { x: event.clientX, y: event.clientY };
      const target = event.currentTarget;
      const { pointerId } = event;
      let isDragging = false;

      // Without this the row stops hearing the pointer the moment it leaves
      // the rail, which is roughly 40px into the gesture.
      try {
        target.setPointerCapture(pointerId);
      } catch {
        /* capture is best-effort; window listeners still see the move */
      }

      const handleMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) return;

        if (
          !isDragging &&
          Math.hypot(moveEvent.clientX - start.x, moveEvent.clientY - start.y) < THRESHOLD
        ) {
          return;
        }
        isDragging = true;
        setGhost({ x: moveEvent.clientX, y: moveEvent.clientY });
      };

      const finish = () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        window.removeEventListener('pointercancel', handleCancel);
        try {
          target.releasePointerCapture(pointerId);
        } catch {
          /* already released with the pointer */
        }
        cleanupRef.current = null;
        setGhost(null);
      };

      const handleUp = (upEvent: PointerEvent) => {
        if (upEvent.pointerId !== pointerId) return;

        finish();
        if (!isDragging) return;

        suppressClickRef.current = true;
        onTearOff({ x: upEvent.clientX, y: upEvent.clientY });
      };

      const handleCancel = (cancelEvent: PointerEvent) => {
        if (cancelEvent.pointerId !== pointerId) return;
        finish();
      };

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
      window.addEventListener('pointercancel', handleCancel);
      cleanupRef.current = finish;
    },
    [enabled, onTearOff],
  );

  const onClickCapture = useCallback((event: React.MouseEvent) => {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  /** The browser's own link drag has to lose, or ours never starts. */
  const onDragStart = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  return {
    /** Spread onto the row that should be draggable. */
    bind: { onPointerDown, onClickCapture, onDragStart, draggable: false },
    /** Non-null while a tear-off is in flight — paint the ghost here. */
    ghost,
    isTearing: ghost !== null,
  };
};
