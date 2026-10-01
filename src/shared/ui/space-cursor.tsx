import { useEffect, useState } from 'react';

import { useSkin, useTheme } from '@/app/providers/theme-provider';

/**
 * The Space skin's pointer: an arrowhead that is a window onto a star field fixed to the viewport.
 * `background-attachment: fixed`, done as two compositor transforms so moving it never repaints.
 */

/** The star tile's side in CSS pixels. The field repeats at this period, too far apart to notice. */
const TILE = 320;
/** The cursor's box. The field canvas is one tile plus one box, so every offset is covered. */
const BOX = 34;
/** Where the arrowhead's point sits in the box: room on the left for the upright hover pose. */
const TIP = { x: 10, y: 2 };

/**
 * The default arrow without its tail, point first, in pixels from the point. A little larger than the
 * system's, because the rim and the acute point eat into the window the stars show through.
 */
const ARROWHEAD: Point[] = [
  [0, 0],
  [0, 26],
  [6.9, 19.9],
  [18.4, 18.4],
];

/** Hover stands the point upright, the way the other skins' pointers lift; a press jabs it short. */
const HOVER_DEGREES = 18;
const PRESS_SCALE = 0.84;

/** The rim's two lines, from the outside in, in pixels. */
const RIM_OUTER = 0.9;
const RIM_INNER = 1.8;

type Point = [number, number];
type Pose = 'rest' | 'hover';

/** Turned clockwise about the point and scaled, then placed in the box. */
const posed = (points: Point[], degrees: number, scale: number): Point[] => {
  const angle = (degrees * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return points.map(([x, y]) => [
    TIP.x + (x * cos - y * sin) * scale,
    TIP.y + (x * sin + y * cos) * scale,
  ]);
};

/** The polygon shrunk by `distance`: each edge moved inward, neighbours re-intersected. */
const inset = (points: Point[], distance: number): Point[] => {
  const count = points.length;
  // Clockwise on screen, so the inward normal of an edge is its direction turned right.
  const lines = points.map((from, index) => {
    const to = points[(index + 1) % count];
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
    const dx = (to[0] - from[0]) / length;
    const dy = (to[1] - from[1]) / length;
    const nx = -dy;
    const ny = dx;
    return { x: from[0] - nx * distance, y: from[1] - ny * distance, dx, dy };
  });

  return lines.map((line, index) => {
    const previous = lines[(index - 1 + count) % count];
    const cross = previous.dx * line.dy - previous.dy * line.dx;
    if (Math.abs(cross) < 1e-6) return [line.x, line.y];
    const t = ((line.x - previous.x) * line.dy - (line.y - previous.y) * line.dx) / cross;
    return [previous.x + previous.dx * t, previous.y + previous.dy * t];
  });
};

const polygon = (points: Point[]): string =>
  `polygon(${points.map(([x, y]) => `${x.toFixed(2)}px ${y.toFixed(2)}px`).join(', ')})`;

/** The three clip shapes — rim, inner rim, window — for every pose and press. */
const shapes = (pose: Pose, pressed: boolean): [string, string, string] => {
  const outline = posed(ARROWHEAD, pose === 'hover' ? HOVER_DEGREES : 0, pressed ? PRESS_SCALE : 1);
  return [polygon(outline), polygon(inset(outline, RIM_OUTER)), polygon(inset(outline, RIM_INNER))];
};

const SHAPES = {
  rest: shapes('rest', false),
  hover: shapes('hover', false),
  'rest-pressed': shapes('rest', true),
  'hover-pressed': shapes('hover', true),
} as const;

const seeded = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
};

/**
 * The deep field, painted once per page: a periodic tile, then tiled four times into a canvas one
 * box larger than the tile. Dense on purpose — the window is about 90 square pixels.
 */
let fieldCache: { canvas: HTMLCanvasElement; ratio: number } | null = null;

const paintField = (ratio: number): HTMLCanvasElement | null => {
  if (fieldCache && fieldCache.ratio === ratio) return fieldCache.canvas;

  const tile = document.createElement('canvas');
  tile.width = tile.height = Math.round(TILE * ratio);
  const context = tile.getContext('2d');
  if (!context) return null;
  context.scale(ratio, ratio);

  const random = seeded(20261001);
  // Anything near an edge is drawn again one tile over, so the tile wraps without a seam.
  const wrapped = (x: number, y: number, reach: number, draw: (x: number, y: number) => void) => {
    for (const ox of [-TILE, 0, TILE]) {
      for (const oy of [-TILE, 0, TILE]) {
        const px = x + ox;
        const py = y + oy;
        if (px + reach < 0 || py + reach < 0 || px - reach > TILE || py - reach > TILE) continue;
        draw(px, py);
      }
    }
  };

  context.fillStyle = '#03050d';
  context.fillRect(0, 0, TILE, TILE);

  // Nebulae: plasma, flare and the brand's teal, the skin's own three lights. Enough of them that
  // wherever the window sits it holds colour, not just black.
  const clouds = [
    '22 150 196',
    '122 62 212',
    '45 230 184',
    '186 128 255',
    '22 150 196',
    '122 62 212',
    '232 96 180',
    '96 232 255',
  ];
  clouds.forEach((tone, index) => {
    const x = random() * TILE;
    const y = random() * TILE;
    const radius = 80 + random() * 100;
    const strength = index === 2 || index === 7 ? 0.3 : 0.5;
    wrapped(x, y, radius, (px, py) => {
      const glow = context.createRadialGradient(px, py, 0, px, py, radius);
      glow.addColorStop(0, `rgb(${tone} / ${strength})`);
      glow.addColorStop(0.55, `rgb(${tone} / ${strength * 0.35})`);
      glow.addColorStop(1, `rgb(${tone} / 0)`);
      context.fillStyle = glow;
      context.fillRect(px - radius, py - radius, radius * 2, radius * 2);
    });
  });

  // Dust: thousands of faint points, so any position of the window holds a few.
  const tints = ['255 255 255', '214 232 255', '255 240 214', '190 214 255'];
  for (let index = 0; index < 5200; index += 1) {
    const x = random() * TILE;
    const y = random() * TILE;
    const size = 0.5 + random() * 0.6;
    context.fillStyle = `rgb(${tints[Math.floor(random() * tints.length)]} / ${0.4 + random() * 0.6})`;
    wrapped(x, y, size, (px, py) => context.fillRect(px, py, size, size));
  }

  // Stars, a few with a halo.
  for (let index = 0; index < 720; index += 1) {
    const x = random() * TILE;
    const y = random() * TILE;
    const bright = index < 90;
    const radius = bright ? 0.9 + random() * 0.7 : 0.5 + random() * 0.4;
    const tone = tints[Math.floor(random() * tints.length)];
    wrapped(x, y, radius * 5, (px, py) => {
      if (bright) {
        const halo = context.createRadialGradient(px, py, 0, px, py, radius * 4.5);
        halo.addColorStop(0, `rgb(${tone} / 0.55)`);
        halo.addColorStop(1, `rgb(${tone} / 0)`);
        context.fillStyle = halo;
        context.fillRect(px - radius * 4.5, py - radius * 4.5, radius * 9, radius * 9);
      }
      context.fillStyle = `rgb(${tone} / ${bright ? 1 : 0.85})`;
      context.beginPath();
      context.arc(px, py, radius, 0, Math.PI * 2);
      context.fill();
    });
  }

  const field = document.createElement('canvas');
  const side = Math.round((TILE + BOX) * ratio);
  field.width = field.height = side;
  const fieldContext = field.getContext('2d');
  if (!fieldContext) return null;
  const step = Math.round(TILE * ratio);
  for (const x of [0, step]) for (const y of [0, step]) fieldContext.drawImage(tile, x, y);

  field.className = 'space-cursor__field';
  field.style.width = field.style.height = `${TILE + BOX}px`;
  fieldCache = { canvas: field, ratio };
  return field;
};

const FINE_POINTER = '(hover: hover) and (pointer: fine)';

/** The pointer state the page asks for: from the stylesheet, so CSS stays the one list of targets. */
const poseAt = (target: EventTarget | null): Pose | null => {
  if (!(target instanceof Element) || target.tagName === 'IFRAME') return null;
  const style = getComputedStyle(target);
  // Anything that set its own cursor — text, grab, crosshair, not-allowed — gets the system's.
  if (style.cursor !== 'none') return null;
  const mark = style.getPropertyValue('--space-cursor').trim();
  return mark === 'hover' || mark === 'rest' ? mark : null;
};

export const SpaceCursor = () => {
  const skin = useSkin();
  const { hasCustomCursor } = useTheme();
  const [isFine, setIsFine] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(FINE_POINTER).matches,
  );

  useEffect(() => {
    const query = window.matchMedia(FINE_POINTER);
    const sync = () => setIsFine(query.matches);
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  const isOn = skin === 'SPACE' && hasCustomCursor && isFine;

  useEffect(() => {
    if (!isOn) return;

    const ratio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const field = paintField(ratio);
    if (!field) return;

    const root = document.documentElement;
    const host = document.createElement('div');
    host.className = 'space-cursor';
    host.setAttribute('aria-hidden', 'true');
    host.dataset.hidden = '';
    const rim = document.createElement('div');
    rim.className = 'space-cursor__rim';
    const inner = document.createElement('div');
    inner.className = 'space-cursor__inner';
    const opening = document.createElement('div');
    opening.className = 'space-cursor__window';
    opening.appendChild(field);
    host.append(rim, inner, opening);
    document.body.appendChild(host);

    let pose: Pose = 'rest';
    let pressed = false;
    let shown = false;
    // Whether the stylesheet hides the system pointer yet, and whether the target needs re-reading.
    let armed = false;
    let stale = true;

    const shape = () => {
      const [outer, middle, hole] = SHAPES[pressed ? (`${pose}-pressed` as const) : pose];
      rim.style.clipPath = outer;
      inner.style.clipPath = middle;
      opening.style.clipPath = hole;
      host.dataset.pose = pose;
    };
    shape();

    const show = (next: boolean) => {
      if (next === shown) return;
      shown = next;
      if (next) delete host.dataset.hidden;
      else host.dataset.hidden = '';
    };

    const place = (x: number, y: number) => {
      const left = x - TIP.x;
      const top = y - TIP.y;
      host.style.transform = `translate3d(${left}px, ${top}px, 0)`;
      // The counter-move, snapped to device pixels so the stars stay sharp.
      const fx = Math.round((((left % TILE) + TILE) % TILE) * ratio) / ratio;
      const fy = Math.round((((top % TILE) + TILE) % TILE) * ratio) / ratio;
      field.style.transform = `translate3d(${-fx}px, ${-fy}px, 0)`;
    };

    const resolve = (target: EventTarget | null) => {
      stale = false;
      const next = poseAt(target);
      if (next === null) {
        show(false);
        return;
      }
      if (next !== pose) {
        pose = next;
        shape();
      }
      show(true);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') {
        show(false);
        return;
      }
      place(event.clientX, event.clientY);
      // The system pointer is hidden only once this one knows where to draw: no cursorless moment.
      if (!armed && !document.fullscreenElement) {
        armed = true;
        root.dataset.spaceCursor = '';
        stale = true;
      }
      if (stale) resolve(event.target);
    };
    const onOver = (event: PointerEvent) => {
      if (armed && event.pointerType !== 'touch') resolve(event.target);
    };
    const onOut = (event: PointerEvent) => {
      // Leaving the window altogether.
      if (!event.relatedTarget) show(false);
    };
    const onDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || event.button !== 0) return;
      pressed = true;
      host.dataset.pressed = '';
      shape();
    };
    const onUp = () => {
      if (!pressed) return;
      pressed = false;
      delete host.dataset.pressed;
      shape();
    };
    // A native drag freezes pointer events and the system draws its own image; re-read after.
    const onDragStart = () => {
      show(false);
      stale = true;
    };
    // Fullscreen renders only its own element, which this is not inside: hand the pointer back.
    const onFullscreen = () => {
      if (!document.fullscreenElement) return;
      show(false);
      armed = false;
      delete root.dataset.spaceCursor;
    };

    const options = { capture: true, passive: true } as const;
    window.addEventListener('pointermove', onMove, options);
    window.addEventListener('pointerover', onOver, options);
    window.addEventListener('pointerout', onOut, options);
    window.addEventListener('pointerdown', onDown, options);
    window.addEventListener('pointerup', onUp, options);
    window.addEventListener('pointercancel', onUp, options);
    window.addEventListener('dragstart', onDragStart, options);
    document.addEventListener('fullscreenchange', onFullscreen);

    return () => {
      window.removeEventListener('pointermove', onMove, options);
      window.removeEventListener('pointerover', onOver, options);
      window.removeEventListener('pointerout', onOut, options);
      window.removeEventListener('pointerdown', onDown, options);
      window.removeEventListener('pointerup', onUp, options);
      window.removeEventListener('pointercancel', onUp, options);
      window.removeEventListener('dragstart', onDragStart, options);
      document.removeEventListener('fullscreenchange', onFullscreen);
      delete root.dataset.spaceCursor;
      host.remove();
    };
  }, [isOn]);

  return null;
};
