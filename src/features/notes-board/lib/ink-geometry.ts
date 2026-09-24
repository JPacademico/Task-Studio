import type { WhiteboardStrokeData } from '@/entities/chat/model/types';

export type InkPoint = [number, number];

/**
 * The closest two kept samples may be while a stroke is being drawn, in CSS
 * pixels.
 *
 * A pointer reports far faster than a stroke needs — a gaming mouse coalesces
 * a thousand samples a second, most of them a fraction of a pixel apart — and
 * every one used to be kept, painted and broadcast. Below about a pixel and a
 * quarter, the quadratic smoothing in `traceStroke` draws the same curve from
 * the sparser set, so the difference is visible only in the payload.
 */
export const MIN_SAMPLE_GAP_PX = 1.25;

/**
 * How far the simplified stroke may stray from the drawn one, in CSS pixels.
 *
 * Applied once, when the stroke is committed, before it is saved and sent. Well
 * under a pixel at the size it was drawn at, which is the only size anybody has
 * seen it at yet — and the stroke is stored normalised, so a larger screen
 * scales the error with it rather than magnifying it.
 */
export const SIMPLIFY_TOLERANCE_PX = 0.6;

/**
 * Stored coordinates are fractions of the board, and four decimal places is a
 * ten-thousandth of it: a fifth of a pixel on a 2,000px wall, which no screen
 * can show. The raw values carried fifteen digits each, which is most of the
 * bytes in every ink frame and in every stroke row.
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
 * Ramer–Douglas–Peucker, in the pixel space the stroke was drawn in.
 *
 * Keeps the points that carry the shape — corners, the apex of a curve — and
 * drops the ones that lie on a line between their neighbours within
 * `tolerance`. A long straight sweep collapses to its two ends; a signature
 * keeps every turn.
 *
 * Measured in pixels rather than in the stored fractions because the two axes
 * of a fraction are different lengths: a board twice as wide as it is tall
 * would otherwise simplify horizontally twice as aggressively.
 *
 * Iterative, with an explicit stack: a stroke can hold thousands of points and
 * the recursive form's depth is the stroke's length in the worst case.
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

/**
 * Lays a stroke's path on a context, smoothed.
 *
 * Midpoint quadratic smoothing: each kept sample becomes the control point of
 * a curve that runs from the midpoint before it to the midpoint after it. The
 * curve passes through no sample except the two ends, which is what rounds a
 * run of pointer samples into a line instead of a chain of straight segments —
 * and it needs no extra points to do it, so it costs nothing on the wire. The
 * personal board's `InkLayer` has drawn its SVG ink this way from the start;
 * the shared wall was still joining the dots.
 */
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
 * Paints one stroke, in order, onto whatever layer it is given.
 *
 * ## Why the width is multiplied by the pixel ratio
 *
 * The canvas is sized in *device* pixels so ink stays sharp on a dense screen,
 * and `lineWidth` is in the canvas's own units. Without the ratio a 3px pen
 * drew 1.5 CSS pixels wide on a retina display and 3 on anything else — so two
 * people on the same board saw the same stroke at different weights, and the
 * rubber rubbed out half the width its own ring on the canvas promised.
 *
 * ## Erasing
 *
 * `destination-out` rather than a stroke in the background colour: the canvas
 * is transparent over the board's own grid and whatever the active skin paints
 * behind it, so "the background colour" is not a colour this code knows. It
 * only removes ink laid down *before* it on the same layer, which is what makes
 * it behave like a rubber rather than a hole.
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
