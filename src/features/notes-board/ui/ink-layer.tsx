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
  const [box, setBox] = useState({ width: 1, height: 1 });

  const measure = (): { width: number; height: number } => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    const next = { width: rect?.width ?? 1, height: rect?.height ?? 1 };
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

  const pointFrom = (event: React.PointerEvent): [number, number] => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect) return [0, 0];
    return [(event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height];
  };

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawing) return;
    event.currentTarget.setPointerCapture(event.pointerId);

    const size = measure();
    pointsRef.current = [pointFrom(event)];
    setLivePath(toPath(pointsRef.current, size));
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawing || pointsRef.current.length === 0) return;

    pointsRef.current.push(pointFrom(event));

    // One repaint per frame no matter how fast the pointer reports.
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      setLivePath(toPath(pointsRef.current, box));
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
