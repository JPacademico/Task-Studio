import type { WhiteboardStrokeData } from '@/entities/chat/model/types';

export type InkPoint = [number, number];

/**
 * The closest two kept samples may be while a stroke is being drawn, in CSS pixels. A pointer
 * reports far faster than a stroke needs — a gaming mouse coalesces a thousand samples a second.
 */
export const MIN_SAMPLE_GAP_PX = 1.25;

/**
 * How far the simplified stroke may stray from the drawn one, in CSS pixels. Applied once, when the
 * stroke is committed, before it is saved and sent.
 */
export const SIMPLIFY_TOLERANCE_PX = 0.6;

/**
 * Stored coordinates are fractions of the board, and four decimal places is a ten-thousandth of it:
 * a fifth of a pixel on a 2,000px wall, which no screen can show.
 */
const QUANTUM = 10_000;

export const quantizePoint = ([x, y]: InkPoint): InkPoint => [
  Math.round(x * QUANTUM) / QUANTUM,
  Math.round(y * QUANTUM) / QUANTUM,
];

/** Whether a new sample is far enough from the last kept one to be worth keeping. */
export const isFarEnough = (
  last: InkPoint,
  next: InkPoint,
  box: { width: number; height: number },
): boolean => {
  const dx = (next[0] - last[0]) * box.width;
  const dy = (next[1] - last[1]) * box.height;
  return dx * dx + dy * dy >= MIN_SAMPLE_GAP_PX * MIN_SAMPLE_GAP_PX;
};

/**
 * Ramer–Douglas–Peucker, in the pixel space the stroke was drawn in. Keeps the points that carry
 * the shape — corners, the apex of a curve.
 */
export const simplifyPoints = (
  points: InkPoint[],
  box: { width: number; height: number },
  tolerance: number = SIMPLIFY_TOLERANCE_PX,
): InkPoint[] => {
  const count = points.length;
  if (count <= 2 || box.width === 0 || box.height === 0) return points.slice();

  const px = (index: number) => points[index][0] * box.width;
  const py = (index: number) => points[index][1] * box.height;

  const keep = new Uint8Array(count);
  keep[0] = 1;
  keep[count - 1] = 1;

  const limit = tolerance * tolerance;
  const stack: [number, number][] = [[0, count - 1]];

  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    const ax = px(first);
    const ay = py(first);
    const dx = px(last) - ax;
    const dy = py(last) - ay;
    const length = dx * dx + dy * dy;

    let farthest = -1;
    let distance = 0;

    for (let index = first + 1; index < last; index += 1) {
      const qx = px(index) - ax;
      const qy = py(index) - ay;

      // Squared distance from the point to the segment (not the infinite
      // line), so a stroke that doubles back on itself keeps its turn.
      let along = length === 0 ? 0 : (qx * dx + qy * dy) / length;
      along = Math.max(0, Math.min(1, along));
      const ex = qx - along * dx;
      const ey = qy - along * dy;
      const off = ex * ex + ey * ey;

      if (off > distance) {
        distance = off;
        farthest = index;
      }
    }

    if (farthest !== -1 && distance > limit) {
      keep[farthest] = 1;
      stack.push([first, farthest], [farthest, last]);
    }
  }

  const result: InkPoint[] = [];
  for (let index = 0; index < count; index += 1) {
    if (keep[index]) result.push(points[index]);
  }
  return result;
};

/** Lays a stroke's path on a context, smoothed. */
export const traceStroke = (
  context: CanvasRenderingContext2D,
  points: InkPoint[],
  width: number,
  height: number,
): void => {
  const count = points.length;
  context.moveTo(points[0][0] * width, points[0][1] * height);

  if (count === 2) {
    context.lineTo(points[1][0] * width, points[1][1] * height);
    return;
  }

  for (let index = 1; index < count - 1; index += 1) {
    const [cx, cy] = points[index];
    const [nx, ny] = points[index + 1];
    context.quadraticCurveTo(
      cx * width,
      cy * height,
      ((cx + nx) / 2) * width,
      ((cy + ny) / 2) * height,
    );
  }

  const [lx, ly] = points[count - 1];
  context.lineTo(lx * width, ly * height);
};

/**
 * Paints one stroke, in order, onto whatever layer it is given. The canvas is sized in *device*
 * pixels so ink stays sharp on a dense screen, and `lineWidth` is in the canvas's own units.
 */
export const paintStroke = (
  context: CanvasRenderingContext2D,
  stroke: WhiteboardStrokeData,
  width: number,
  height: number,
  ratio: number,
): void => {
  if (stroke.points.length < 2) return;

  context.globalCompositeOperation = stroke.erase ? 'destination-out' : 'source-over';
  // Any opaque colour erases; the alpha is what does the work.
  context.strokeStyle = stroke.erase ? '#000' : stroke.color;
  context.lineWidth = stroke.width * ratio;
  context.beginPath();
  traceStroke(context, stroke.points, width, height);
  context.stroke();
};
