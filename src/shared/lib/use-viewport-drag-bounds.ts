import { useCallback, useEffect, useState, type RefObject } from 'react';
import type { MotionValue } from 'framer-motion';

/**
 * How much of the element has to stay on screen, in pixels from each edge.
 *
 * Eight rather than zero: an element flush against the viewport edge has its
 * shadow clipped and, on the two rails, sits under chrome that is itself only a
 * few pixels in. A small inset reads as "parked" rather than as "stuck".
 */
const MARGIN = 8;

export interface DragBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Framer `dragConstraints` that keep a free-floating element inside the window.
 *
 * ## Why one hook instead of the numbers at each call site
 *
 * Three surfaces float over the app — the import tracker, the project chat and
 * the torn-off shortcut pills — and each had grown its own answer:
 *
 *   - the tracker and the chat both hand-wrote `{ left, right, top, bottom }`
 *     from **literal pixel sizes** (`window.innerWidth - 360`), so the bound was
 *     only correct while the card happened to be 360 wide. Every change to the
 *     padding inside them silently moved the edge they were bounding against.
 *   - the pills had no constraints at all. They clamped *after* the drop,
 *     against an estimated pill size, so the pill spent the whole gesture free
 *     to be dragged into the void and then teleported back.
 *   - all three read `window.innerWidth` during render, which is a value that
 *     changes without a render. Resize the window and the bounds a component
 *     was holding described the window it used to be in.
 *
 * Measuring the element answers all three at once: no literal sizes, no stale
 * viewport, and the constraint applies *during* the gesture, which is the only
 * time it is visible.
 *
 * ## Why the constraints are relative to the layout position
 *
 * Framer measures an object constraint from where the element sits with no
 * transform applied — not from where it currently appears. So the element's own
 * `x`/`y` have to come back out of the measured rect before the arithmetic, and
 * that is what the motion values are for. Miss that step and every drag starts
 * from bounds offset by however far the element was already dragged, which
 * compounds: after three drags the element cannot reach the left half of the
 * screen at all.
 *
 * ## When it measures
 *
 * On mount, on resize, and — the one that matters — on `onDragStart` via the
 * returned `measure`. A floating card may have been resized by its own content
 * (the tracker grows a row per import) between the last measurement and this
 * gesture, and the rect at the moment the drag begins is the only one that is
 * certainly right.
 */
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

    /*
     * `Math.max` on both far edges, so an element larger than the viewport is
     * pinned by its top-left corner rather than given an inverted range.
     *
     * Framer does not validate that `left <= right`, and an inverted pair
     * behaves as an elastic band with no rest position: the element springs
     * between the two bounds and never settles. A phone in landscape with the
     * chat open is genuinely this case.
     */
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
