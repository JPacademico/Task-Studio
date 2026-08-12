import { useEffect, useRef, useState } from 'react';

import { EDGE_REVEAL_PX } from '@/shared/config/constants';

type Edge = 'left' | 'top' | 'right' | 'bottom';

interface Options {
  edge: Edge;
  /** Proximity that opens the menu. */
  threshold?: number;
  /** How far the pointer must travel away before it closes again. */
  hideDistance?: number;
  /** Disable on touch devices, where hover does not exist. */
  enabled?: boolean;
  /** User pinned the menu open: proximity stops mattering entirely. */
  locked?: boolean;
}

/**
 * Reveals a hidden edge menu on pointer proximity.
 *
 * Runs entirely off a passive `pointermove` listener with the work deferred to
 * `requestAnimationFrame`: the handler never touches layout, so revealing a
 * panel stays a compositor-only job at 60fps.
 *
 * The hysteresis (open at `threshold`, close at `hideDistance`) is what keeps
 * the panel from flickering when the pointer hovers right on the boundary.
 */
export const useEdgeReveal = ({
  edge,
  threshold = EDGE_REVEAL_PX,
  hideDistance = 320,
  enabled = true,
  locked = false,
}: Options) => {
  const [isRevealed, setIsRevealed] = useState(locked);
  const pinnedRef = useRef(false);
  const frameRef = useRef(0);

  // A pinned menu is simply always open; the listener below is skipped entirely
  // so a pinned rail costs nothing per pointer move.
  useEffect(() => {
    if (locked) setIsRevealed(true);
  }, [locked]);

  useEffect(() => {
    if (!enabled || locked) {
      if (!locked) setIsRevealed(false);
      return;
    }

    const distanceToEdge = (event: PointerEvent): number => {
      switch (edge) {
        case 'left':
          return event.clientX;
        case 'right':
          return window.innerWidth - event.clientX;
        case 'top':
          return event.clientY;
        case 'bottom':
          return window.innerHeight - event.clientY;
      }
    };

    const handlePointerMove = (event: PointerEvent): void => {
      // Coarse pointers (touch) never drive the reveal.
      if (event.pointerType === 'touch') return;

      cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        if (pinnedRef.current) return;

        const distance = distanceToEdge(event);
        setIsRevealed((current) =>
          current ? distance <= hideDistance : distance <= threshold,
        );
      });
    };

    const handlePointerLeave = (): void => {
      if (!pinnedRef.current) setIsRevealed(false);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [edge, enabled, hideDistance, locked, threshold]);

  return {
    isRevealed: locked || isRevealed,
    /** Keeps the panel open while a menu inside it has focus. */
    pin: () => {
      pinnedRef.current = true;
      setIsRevealed(true);
    },
    unpin: () => {
      pinnedRef.current = false;
    },
    open: () => setIsRevealed(true),
    close: () => {
      if (locked) return;
      pinnedRef.current = false;
      setIsRevealed(false);
    },
    toggle: () => setIsRevealed((current) => !current),
  };
};
