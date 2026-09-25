import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { useReducedMotion } from 'framer-motion';

import { peerColor } from '@/features/notes-board/lib/peer-color';

/**
 * Whether Lucy has already drawn her arrow in this page load.
 *
 * Module state, deliberately — not component state and not storage. The
 * animation plays once per *load*: leaving for another page of the site and
 * coming back remounts the section, and the arrow should simply be there, as
 * ink on a real wall would be. A reload clears it, which is the one thing that
 * should let it play again.
 */
let hasDrawn = false;

/** The name on the pointer. A teammate, not a mascot: an ordinary first name. */
const NAME = 'Lucy';

/** Her colour, derived exactly as a real collaborator's is. See `peerColor`. */
const INK = peerColor('lucy@example.test');

/** How much of the board has to be on screen before she starts. */
const IN_VIEW_THRESHOLD = 0.45;

/** A beat after the notes have pinned themselves up, so the target is there. */
const START_DELAY_MS = 900;

interface Point {
  x: number;
  y: number;
}

interface Geometry {
  width: number;
  height: number;
  /** The shaft: a hand-drawn curve from open wall to just short of the note. */
  shaft: string;
  /** The head: one stroke, barb → tip → barb, the way a hand draws it. */
  head: string;
  /** Where the pointer walks to when she is done, round the heading. */
  exit: string;
  start: Point;
  park: Point;
}

/**
 * The arrow, laid out against the board as it actually is.
 *
 * Aimed at the top-right note's *measured* box rather than at fixed
 * coordinates, because the board is as wide as the window allows and the notes
 * are placed in percentages: a hard-coded path lands short on a wide screen
 * and inside the paper on a narrow one. Everything else is proportional to the
 * board, and kept out of the heading's box in the middle of it.
 */
const measure = (board: HTMLElement, target: HTMLElement): Geometry => {
  const box = board.getBoundingClientRect();
  const note = target.getBoundingClientRect();
  const width = box.width;
  const height = box.height;

  const noteLeft = note.left - box.left;
  const noteTop = note.top - box.top;

  // Just short of the paper, level with its lower half: an arrow drawn *at* a
  // note, not into it.
  const tip = { x: noteLeft - 14, y: noteTop + note.height * 0.62 };
  // Open wall above the heading's right shoulder.
  const start = { x: width * 0.56, y: height * 0.34 };

  const dx = tip.x - start.x;
  const dy = tip.y - start.y;
  // Out to the right first, then up into the note — a curve with a belly, the
  // way an arrow is actually drawn, rather than a ruler line.
  const c1 = { x: start.x + dx * 0.42, y: start.y + Math.abs(dy) * 0.18 };
  const c2 = { x: tip.x - dx * 0.22, y: tip.y + Math.abs(dy) * 0.42 };
  const shaft = `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${tip.x} ${tip.y}`;

  // The head follows the curve's last tangent, swept back ±28°.
  const angle = Math.atan2(tip.y - c2.y, tip.x - c2.x);
  const barb = (turn: number): Point => ({
    x: tip.x - 17 * Math.cos(angle + turn),
    y: tip.y - 17 * Math.sin(angle + turn),
  });
  const left = barb(0.49);
  const right = barb(-0.49);
  const head = `M ${left.x} ${left.y} L ${tip.x} ${tip.y} L ${right.x} ${right.y}`;

  // Down the right-hand side of the heading and along to the bottom of the
  // board, where she stays: out of the way, still visibly there.
  const park = { x: width * 0.52, y: height * 0.9 };
  const exit = `M ${right.x} ${right.y} Q ${width * 0.78} ${height * 0.66}, ${park.x} ${park.y}`;

  return { width, height, shaft, head, exit, start, park };
};

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * Lucy, a teammate on the same board, drawing an arrow to the top-right note.
 *
 * ## Why it looks exactly like the live board
 *
 * Because it is the live board's pointer. The node is `.board-cursor` with the
 * same arrow and the same name tag that `PresenceCursors` draws for a real
 * colleague, and the ink is her colour, derived the way a real collaborator's
 * is. The section's claim is "other people are here with you", and the most
 * convincing way to make it is to show the actual thing rather than an
 * illustration of it.
 *
 * ## Under everything
 *
 * Rendered first inside the board with no z-index, so every note, the heading
 * and any sheet being dragged paint over both the ink and the pointer. It is
 * a scene *on* the wall, never a layer on top of the reader's hands, and it is
 * `pointer-events-none` throughout.
 *
 * ## When it plays
 *
 * Once per page load (see `hasDrawn`), only when at least 45% of the board is
 * actually on screen — a real observer, with no timer to trip it early — and
 * only on the desktop wall, where the notes are placed around the heading. On
 * the stacked phone layout there is no top-right note to point at. With
 * reduced motion it does not play at all: the finished drawing is simply
 * there.
 *
 * The animation is a small hand-rolled `requestAnimationFrame` timeline rather
 * than Framer: it drives one dash offset and one transform, and it needs the
 * exact length of a curve, which only the DOM can measure.
 */
export const LucyCursor = ({ boardRef }: { boardRef: RefObject<HTMLElement | null> }) => {
  const reduceMotion = useReducedMotion();
  const shaftRef = useRef<SVGPathElement>(null);
  const headRef = useRef<SVGPathElement>(null);
  const exitRef = useRef<SVGPathElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  const [isWide, setIsWide] = useState(false);
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const [phase, setPhase] = useState<'waiting' | 'drawing' | 'done'>(() =>
    hasDrawn ? 'done' : 'waiting',
  );

  // The wall layout only exists from `lg` up; below it the notes are a list.
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsWide(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  // Measure — and re-measure whenever the board changes size, so the finished
  // arrow stays aimed at its note on a resized window.
  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board || !isWide) return;

    const update = () => {
      const target = board.querySelector<HTMLElement>('[data-lucy-target]');
      if (target) setGeometry(measure(board, target));
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(board);
    return () => observer.disconnect();
  }, [boardRef, isWide]);

  // Wait for the board to be properly in view, once.
  useEffect(() => {
    const board = boardRef.current;
    if (!board || !isWide || phase !== 'waiting') return;

    if (reduceMotion) {
      hasDrawn = true;
      setPhase('done');
      return;
    }

    let timer = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.intersectionRatio >= IN_VIEW_THRESHOLD)) return;
        observer.disconnect();
        timer = window.setTimeout(() => setPhase('drawing'), START_DELAY_MS);
      },
      { threshold: [IN_VIEW_THRESHOLD] },
    );
    observer.observe(board);

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [boardRef, isWide, phase, reduceMotion]);

  // The drawing itself.
  useEffect(() => {
    if (phase !== 'drawing' || !geometry) return;

    const shaft = shaftRef.current;
    const head = headRef.current;
    const exit = exitRef.current;
    const cursor = cursorRef.current;
    if (!shaft || !head || !exit || !cursor) return;

    const shaftLength = shaft.getTotalLength();
    const headLength = head.getTotalLength();
    const exitLength = exit.getTotalLength();

    shaft.style.strokeDasharray = `${shaftLength}`;
    shaft.style.strokeDashoffset = `${shaftLength}`;
    head.style.strokeDasharray = `${headLength}`;
    head.style.strokeDashoffset = `${headLength}`;

    const place = (point: Point) => {
      // -2px so the arrow's point, not its box's corner, sits on the pen.
      cursor.style.transform = `translate3d(${point.x - 2}px, ${point.y - 2}px, 0)`;
    };
    const headStart = head.getPointAtLength(0);

    /*
     * The script, in milliseconds from the first frame:
     *
     *   0–400      she arrives at the start of the stroke
     *   400–1800   the shaft
     *   1800–2000  pen up, across to the first barb
     *   2000–2450  the head, in one stroke
     *   2650–3850  she wanders off to the bottom of the board and stays
     */
    const approach = { x: geometry.start.x - 70, y: geometry.start.y + 46 };
    let frame = 0;
    let startedAt = 0;

    const step = (now: number) => {
      if (!startedAt) startedAt = now;
      const elapsed = now - startedAt;
      const span = (from: number, to: number) => Math.min(1, Math.max(0, (elapsed - from) / (to - from)));

      cursor.style.opacity = elapsed > 0 ? '1' : '0';

      if (elapsed < 400) {
        const t = easeOut(span(0, 400));
        place({
          x: approach.x + (geometry.start.x - approach.x) * t,
          y: approach.y + (geometry.start.y - approach.y) * t,
        });
      } else if (elapsed < 1800) {
        const t = easeInOut(span(400, 1800));
        shaft.style.strokeDashoffset = `${shaftLength * (1 - t)}`;
        place(shaft.getPointAtLength(shaftLength * t));
      } else if (elapsed < 2000) {
        shaft.style.strokeDashoffset = '0';
        const tip = shaft.getPointAtLength(shaftLength);
        const t = easeInOut(span(1800, 2000));
        place({ x: tip.x + (headStart.x - tip.x) * t, y: tip.y + (headStart.y - tip.y) * t });
      } else if (elapsed < 2450) {
        const t = span(2000, 2450);
        head.style.strokeDashoffset = `${headLength * (1 - t)}`;
        place(head.getPointAtLength(headLength * t));
      } else if (elapsed < 2650) {
        head.style.strokeDashoffset = '0';
      } else {
        const t = easeInOut(span(2650, 3850));
        place(exit.getPointAtLength(exitLength * t));
        if (t >= 1) {
          hasDrawn = true;
          setPhase('done');
          return;
        }
      }

      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [geometry, phase]);

  if (!isWide || !geometry) return null;

  const isDone = phase === 'done';

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <svg
        className="absolute inset-0 h-full w-full overflow-visible"
        viewBox={`0 0 ${geometry.width} ${geometry.height}`}
        fill="none"
      >
        <g
          stroke={INK}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          // Nothing drawn until she starts; everything drawn once she is done.
          opacity={phase === 'waiting' ? 0 : 0.9}
        >
          <path
            ref={shaftRef}
            d={geometry.shaft}
            style={isDone ? { strokeDasharray: 'none', strokeDashoffset: 0 } : undefined}
          />
          <path
            ref={headRef}
            d={geometry.head}
            style={isDone ? { strokeDasharray: 'none', strokeDashoffset: 0 } : undefined}
          />
        </g>
        {/* Never painted: only measured, for the walk to the bottom. */}
        <path ref={exitRef} d={geometry.exit} stroke="none" />
      </svg>

      {/* The live board's own pointer, name tag and all. */}
      <div
        ref={cursorRef}
        className="board-cursor"
        style={
          {
            '--board-cursor-ink': INK,
            // Moved per frame by the timeline; the class's glide would only lag it.
            transition: 'opacity 200ms ease-out',
            opacity: isDone ? 1 : 0,
            transform: isDone
              ? `translate3d(${geometry.park.x - 2}px, ${geometry.park.y - 2}px, 0)`
              : undefined,
          } as CSSProperties
        }
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2 1.4 13.2 7.6 8.1 8.6 6.2 13.6Z" />
        </svg>
        <span className="board-cursor__name">{NAME}</span>
      </div>
    </div>
  );
};
