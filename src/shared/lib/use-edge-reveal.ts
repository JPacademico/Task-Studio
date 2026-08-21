import { useCallback, useEffect, useRef, useState } from 'react';

import { EDGE_REVEAL_PX } from '@/shared/config/constants';

type Edge = 'left' | 'top' | 'right' | 'bottom';

/**
 * A strip along one or more viewport edges in which the panel refuses to open.
 *
 * Measured inwards from each named edge, in pixels. Only *opening* is
 * suppressed: a panel already out stays out, because the alternative is a rail
 * that snaps shut the moment the pointer travels up its own length.
 */
export type KeepOut = Partial<Record<Edge, number>>;

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
  /** Bands the pointer can cross without triggering a reveal. See `KeepOut`. */
  keepOut?: KeepOut;
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
 *
 * Every callback below is stable across renders. That is not tidiness: callers
 * drive `pin`/`unpin` from effects that react to a gesture ending, and a fresh
 * `unpin` on every render would fire those effects continuously and cancel the
 * hover lock the moment it was taken.
 */
export const useEdgeReveal = ({
  edge,
  threshold = EDGE_REVEAL_PX,
  hideDistance = 320,
  enabled = true,
  locked = false,
  keepOut,
}: Options) => {
  const [isRevealed, setIsRevealed] = useState(locked);
  const pinnedRef = useRef(false);
  const frameRef = useRef(0);

  // Read inside the listener rather than closed over, so a caller passing an
  // object literal does not tear the listener down and rebuild it every render.
  const keepOutRef = useRef(keepOut);
  keepOutRef.current = keepOut;

  const lockedRef = useRef(locked);
  lockedRef.current = locked;

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

    /*
     * "The pointer is somewhere this panel has agreed not to answer from."
     *
     * The case this exists for: the account avatar sits at the far right of the
     * top bar, a couple of dozen pixels from the edge of the screen — which is
     * also the right rail's trigger zone. Reaching for your own profile picture
     * and overshooting it by a hair threw the whole project rail across the
     * page, over whatever was underneath it. The two controls were competing
     * for the same pixels and the rail was winning.
     *
     * Naming the header as a keep-out band settles that argument in the
     * header's favour, and costs the rail nothing: coming *down* the right
     * edge still opens it, because that gesture starts below the bar. Only an
     * approach that begins inside the header is ignored.
     */
    const isInKeepOut = (event: PointerEvent): boolean => {
      const bands = keepOutRef.current;
      if (!bands) return false;

      return (
        (bands.top !== undefined && event.clientY <= bands.top) ||
        (bands.bottom !== undefined && window.innerHeight - event.clientY <= bands.bottom) ||
        (bands.left !== undefined && event.clientX <= bands.left) ||
        (bands.right !== undefined && window.innerWidth - event.clientX <= bands.right)
      );
    };

    const handlePointerMove = (event: PointerEvent): void => {
      // Coarse pointers (touch) never drive the reveal.
      if (event.pointerType === 'touch') return;

      cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        if (pinnedRef.current) return;

        const distance = distanceToEdge(event);
        setIsRevealed((current) => {
          if (current) return distance <= hideDistance;
          if (isInKeepOut(event)) return false;
          return distance <= threshold;
        });
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

  /** Keeps the panel open while a menu inside it has focus. */
  const pin = useCallback(() => {
    pinnedRef.current = true;
    setIsRevealed(true);
  }, []);

  const unpin = useCallback(() => {
    pinnedRef.current = false;
  }, []);

  const open = useCallback(() => setIsRevealed(true), []);

  const close = useCallback(() => {
    if (lockedRef.current) return;
    pinnedRef.current = false;
    setIsRevealed(false);
  }, []);

  const toggle = useCallback(() => setIsRevealed((current) => !current), []);

  return { isRevealed: locked || isRevealed, pin, unpin, open, close, toggle };
};

/**
 * Lets go of the hover lock once a drag out of a rail has finished.
 *
 * A tear-off takes pointer capture (see `useTearOff`), and capture routes the
 * compatibility mouse events to the captured element too — so the rail never
 * receives the `mouseleave` that would normally release the lock its
 * `mouseenter` took. By the time the drag ends the pointer is halfway across
 * the screen, and `mouseleave` only fires on a *crossing*, so it never fires
 * again either: the rail sat open, unpinned and unclosable, until the user
 * hovered it a second time purely to be able to leave it.
 *
 * Releasing the lock when the gesture ends is what restores the ordinary
 * behaviour — the pointer is already far from the edge, so the next movement
 * slides the rail shut on its own, exactly as if it had been left normally.
 */
export const useReleaseAfterTearOff = (
  isTearing: boolean,
  { unpin, close }: { unpin: () => void; close: () => void },
): void => {
  const wasTearing = useRef(false);

  useEffect(() => {
    if (isTearing) {
      wasTearing.current = true;
      return;
    }

    if (!wasTearing.current) return;
    wasTearing.current = false;

    unpin();
    close();
  }, [close, isTearing, unpin]);
};
