import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Below this the gesture was a click on the row, not a drag out of the rail. Small on purpose. The
 * old value asked for 14px of travel before anything appeared.
 */
const THRESHOLD = 6;

interface TearOffOptions {
  /** Off on touch, where a long press already means something else. */
  enabled?: boolean;
  /** Fired on release, with the drop point in viewport coordinates. */
  onTearOff: (point: { x: number; y: number }) => void;
}

/**
 * Drag a row out of a menu, in one press. Deliberately not Framer Motion's `drag`: the rows live
 * inside a scrolling `overflow-y-auto` column.
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
