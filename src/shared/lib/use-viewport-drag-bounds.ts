import { useCallback, useEffect, useState, type RefObject } from 'react';
import type { MotionValue } from 'framer-motion';

/**
 * How much of the element has to stay on screen, in pixels from each edge. Eight rather than zero:
 * an element flush against the viewport edge has its shadow clipped and, on the two rails.
 */
const MARGIN = 8;

export interface DragBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Framer `dragConstraints` that keep a free-floating element inside the window. */
export const useViewportDragBounds = (
  ref: RefObject<HTMLElement | null>,
  x: MotionValue<number>,
  y: MotionValue<number>,
  margin: number = MARGIN,
): { bounds: DragBounds | undefined; measure: () => void } => {
  const [bounds, setBounds] = useState<DragBounds | undefined>(undefined);

  const measure = useCallback(() => {
    const node = ref.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();

    // Where the element would be with no transform on it. See the note above.
    const layoutLeft = rect.left - x.get();
    const layoutTop = rect.top - y.get();

    const left = margin - layoutLeft;
    const top = margin - layoutTop;

    // `Math.max` on both far edges, so an element larger than the viewport is pinned by its
    // top-left corner rather than given an inverted range.
    setBounds({
      left,
      top,
      right: Math.max(left, window.innerWidth - margin - rect.width - layoutLeft),
      bottom: Math.max(top, window.innerHeight - margin - rect.height - layoutTop),
    });
  }, [margin, ref, x, y]);

  useEffect(() => {
    measure();

    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  return { bounds, measure };
};
