import { useEffect, useRef, useState } from 'react';

import type { BoardStroke } from '@/entities/note/model/types';
import { cn } from '@/shared/lib/cn';

interface InkLayerProps {
  strokes: BoardStroke[];
  /** Drawing is off in select/connect mode; the layer then ignores the pointer. */
  isDrawing: boolean;
  color: string;
  width: number;
  onCommit: (points: [number, number][]) => void;
}

/** Points are stored normalised, so a board survives a different window size. */
const toPath = (points: [number, number][], box: { width: number; height: number }): string => {
  if (points.length === 0) return '';

  const [first, ...rest] = points;
  const start = `M ${first[0] * box.width} ${first[1] * box.height}`;

  // Quadratic midpoint smoothing: a raw polyline of pointer samples looks
  // jagged, and this rounds it without resampling or extra points.
  const segments = rest.map(([px, py], index) => {
    const previous = points[index];
    const midX = ((previous[0] + px) / 2) * box.width;
    const midY = ((previous[1] + py) / 2) * box.height;
    return `Q ${previous[0] * box.width} ${previous[1] * box.height} ${midX} ${midY}`;
  });

  return [start, ...segments].join(' ');
};

/**
 * Freehand ink on the board.
 *
 * The in-progress stroke lives in this component alone, so drawing repaints one
 * `<path>` instead of the whole board. Committed strokes are plain SVG paths,
 * which keeps them crisp at any zoom and lets each one be erased on its own.
 */
export const InkLayer = ({ strokes, isDrawing, color, width, onCommit }: InkLayerProps) => {
  const surfaceRef = useRef<SVGSVGElement>(null);
  const pointsRef = useRef<[number, number][]>([]);
  const frameRef = useRef(0);
  const [livePath, setLivePath] = useState('');

  /*
   * The surface's size, in a ref as well as in state.
   *
   * ## The bug this fixes, which looked like "straight lines"
   *
   * The in-progress stroke used to be rendered from the `box` *state*, read
   * inside a `requestAnimationFrame` callback. That callback closes over
   * whichever `box` existed when the handler was created — and between the
   * first `pointerdown` and React's next commit, that is still the initial
   * `{ width: 1, height: 1 }`. Every point in that window was therefore scaled
   * against a one-pixel canvas and collapsed into the top-left corner, so the
   * live path jumped from the corner to the pointer as a hard diagonal and then
   * carried on normally.
   *
   * How visible that is depends entirely on how quickly the browser gets round
   * to the commit and the ResizeObserver, which is why it reproduced on some
   * engines and not others rather than everywhere.
   *
   * A ref has no such window: it is written synchronously by `measure()` and
   * read at its current value by every frame after. The state copy stays,
   * because the *committed* strokes are rendered during render and need a value
   * that triggers one.
   */
  const boxRef = useRef({ width: 1, height: 1 });
  const [box, setBox] = useState({ width: 1, height: 1 });

  const measure = (): { width: number; height: number } => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    const next = { width: rect?.width ?? 1, height: rect?.height ?? 1 };
    boxRef.current = next;
    setBox(next);
    return next;
  };

  // Stored points are normalised, so the box has to be known before the first
  // paint — otherwise saved strokes render into a 1×1 space and vanish.
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;

    const observer = new ResizeObserver(() => measure());
    observer.observe(surface);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  /** Client coordinates to the normalised space a stroke is stored in. */
  const pointFromClient = (point: { clientX: number; clientY: number }): [number, number] => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return [0, 0];
    return [(point.clientX - rect.left) / rect.width, (point.clientY - rect.top) / rect.height];
  };

  const pointFrom = (event: React.PointerEvent): [number, number] => pointFromClient(event);

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawing) return;
    // A right-click or a middle-click is not a stroke, and a secondary pointer
    // in a two-finger gesture is a scroll the browser is about to claim.
    if (event.button !== 0 || !event.isPrimary) return;

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /*
       * Capture is an optimisation, not a requirement.
       *
       * It keeps the stroke alive when the pointer leaves the SVG mid-draw. It
       * also throws `NotFoundError` for a pointer the browser considers gone —
       * which happens on a pen that reports out of range, and on the synthetic
       * pointers some browser extensions inject. Letting that propagate aborted
       * the handler *before the first point was recorded*, so the whole stroke
       * was lost rather than merely being uncaptured.
       */
    }

    const size = measure();
    pointsRef.current = [pointFrom(event)];
    setLivePath(toPath(pointsRef.current, size));
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawing || pointsRef.current.length === 0) return;

    /*
     * Every sample the browser took, not just the one it chose to deliver.
     *
     * A pointer reports at up to 240Hz; the browser batches those into one
     * `pointermove` per frame and hands over the *last* one, throwing the rest
     * away unless they are asked for. On a fast stroke that is one sample every
     * 16ms with the pointer travelling several hundred pixels a second — so the
     * curve between two samples is a straight line, and a quick flick draws a
     * polygon instead of an arc.
     *
     * `getCoalescedEvents()` returns the discarded samples, which is exactly
     * what this is for. How aggressively an engine coalesces is its own
     * business, which is why the same flick looked fine on one browser and
     * angular on another.
     *
     * Guarded because it is absent on older Safari, where the single event is
     * all there is and the behaviour is what it always was.
     */
    const samples =
      typeof event.nativeEvent.getCoalescedEvents === 'function'
        ? event.nativeEvent.getCoalescedEvents()
        : [];

    if (samples.length > 0) {
      for (const sample of samples) pointsRef.current.push(pointFromClient(sample));
    } else {
      pointsRef.current.push(pointFrom(event));
    }

    // One repaint per frame no matter how fast the pointer reports.
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      // `boxRef`, never the `box` state — see the note where it is declared.
      setLivePath(toPath(pointsRef.current, boxRef.current));
    });
  };

  const handlePointerUp = () => {
    if (pointsRef.current.length < 2) {
      pointsRef.current = [];
      setLivePath('');
      return;
    }

    // Thin the samples before persisting: a fast stroke can carry hundreds of
    // near-identical points, and the curve is unchanged without them.
    const thinned = pointsRef.current.filter(
      (point, index) =>
        index === 0 ||
        index === pointsRef.current.length - 1 ||
        Math.hypot(point[0] - pointsRef.current[index - 1][0], point[1] - pointsRef.current[index - 1][1]) >
          0.004,
    );

    onCommit(thinned.slice(0, 2000));
    pointsRef.current = [];
    setLivePath('');
  };

  return (
    <svg
      ref={surfaceRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className={cn(
        'absolute inset-0 h-full w-full',
        isDrawing ? 'z-30 cursor-crosshair touch-none' : 'pointer-events-none',
      )}
    >
      {strokes.map((stroke) => (
        <path
          key={stroke.id}
          d={toPath(stroke.points, box)}
          stroke={stroke.color}
          strokeWidth={stroke.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}

      {livePath && (
        <path
          d={livePath}
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      )}
    </svg>
  );
};
