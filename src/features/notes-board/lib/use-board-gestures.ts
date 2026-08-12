import { useCallback, useEffect, useRef, useState } from 'react';

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface MarqueeOptions {
  /** Off in draw/connect mode, where a drag on the board means something else. */
  enabled: boolean;
  surfaceRef: React.RefObject<HTMLElement | null>;
  /** Fired once, on release, with the box in surface coordinates. */
  onCommit: (rect: Rect, additive: boolean) => void;
}

/** Below this the gesture was a click on the background, not a lasso. */
const MIN_DRAG = 6;

/**
 * Rubber-band selection over the board background.
 *
 * Dragging a box around things is how every canvas tool on earth selects more
 * than one object, and it is the fix for a board whose only multi-select was
 * Ctrl+click — a shortcut that is invisible until somebody tells you about it.
 *
 * The live box is component state on the board (one small absolutely-positioned
 * div), and the intersection test only runs on release, so dragging the lasso
 * never touches a single Post-it.
 */
export const useMarqueeSelection = ({ enabled, surfaceRef, onCommit }: MarqueeOptions) => {
  const [rect, setRect] = useState<Rect | null>(null);
  const originRef = useRef<{ x: number; y: number; additive: boolean } | null>(null);

  const boxFrom = useCallback((clientX: number, clientY: number): Rect | null => {
    const origin = originRef.current;
    const bounds = surfaceRef.current?.getBoundingClientRect();
    if (!origin || !bounds) return null;

    const currentX = clientX - bounds.left;
    const currentY = clientY - bounds.top;

    return {
      left: Math.min(origin.x, currentX),
      top: Math.min(origin.y, currentY),
      width: Math.abs(currentX - origin.x),
      height: Math.abs(currentY - origin.y),
    };
  }, [surfaceRef]);

  useEffect(() => {
    if (!rect) return;

    const handleMove = (event: PointerEvent) => {
      const next = boxFrom(event.clientX, event.clientY);
      if (next) setRect(next);
    };

    const handleUp = (event: PointerEvent) => {
      const final = boxFrom(event.clientX, event.clientY);
      const additive = originRef.current?.additive ?? false;

      originRef.current = null;
      setRect(null);

      if (final && (final.width > MIN_DRAG || final.height > MIN_DRAG)) {
        onCommit(final, additive);
      } else {
        // A plain click on the background clears the selection.
        onCommit({ left: 0, top: 0, width: 0, height: 0 }, additive);
      }
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [boxFrom, onCommit, rect]);

  const onPointerDown = (event: React.PointerEvent) => {
    // Only a press on the board itself starts a lasso — never one that began
    // on a Post-it, a connector or a toolbar sitting over the surface.
    if (!enabled || event.button !== 0 || event.target !== event.currentTarget) return;

    const bounds = surfaceRef.current?.getBoundingClientRect();
    if (!bounds) return;

    originRef.current = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
      additive: event.shiftKey || event.ctrlKey || event.metaKey,
    };
    setRect({ left: originRef.current.x, top: originRef.current.y, width: 0, height: 0 });
  };

  return { rect, onPointerDown };
};

/**
 * Pointer position in surface coordinates, sampled on an animation frame.
 *
 * Used to draw the connector that follows the cursor between picking the two
 * ends of a link — the piece of feedback that turns "click two notes" from an
 * instruction into something the user can see happening.
 */
export const usePointerPosition = (
  enabled: boolean,
  surfaceRef: React.RefObject<HTMLElement | null>,
) => {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setPosition(null);
      return;
    }

    const handleMove = (event: PointerEvent) => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        const bounds = surfaceRef.current?.getBoundingClientRect();
        if (!bounds) return;
        setPosition({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
      });
    };

    window.addEventListener('pointermove', handleMove, { passive: true });
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('pointermove', handleMove);
    };
  }, [enabled, surfaceRef]);

  return position;
};
