/**
 * Generates the PWA icon set without any image dependency.
 *
 * iOS/Safari refuses to install a PWA whose manifest icons 404, and a binary
 * asset does not belong in source control, so the icons are produced from code:
 * a Post-it note — the object the whole app is built around — with its corner
 * rolled under and the product's initial on it, encoded as PNG by hand.
 *
 * The geometry is lifted from the SVG mark rather than redrawn, so the icon on
 * a home screen and the mark in the top bar are the same object. What differs
 * is only what a raster at 16px needs: a heavier stroke and a shaded fold.
 *
 * Run with: npm run icons
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = join(ROOT, 'public');
const ICONS_DIR = join(PUBLIC_DIR, 'icons');

const BRAND = [14, 116, 144]; // #0e7490
const BRAND_DEEP = [21, 94, 117]; // #155e75

/*
 * The sheet, as the design team drew it: a deeper, more saturated gold than the
 * pale yellow this used to be, and navy ink rather than a muddy brown.
 */
const PAPER_TOP = [252, 199, 75]; // #fcc74b
const PAPER_BOTTOM = [243, 174, 28]; // #f3ae1c
const INK = [38, 56, 75]; // #26384b

/*
 * The underside of the curl, and the one place this deliberately departs from
 * the reference art.
 *
 * In the original the lifted corner is a *lighter* yellow, which is what paper
 * actually does when light passes through it. At 180px that is a lovely detail
 * and at 16px it is nothing at all: two yellows a few percent apart occupy four
 * pixels and merge into one flat corner, and the curl — the thing that makes
 * the object read as paper rather than as a square — disappears. Shading the
 * underside instead keeps it legible at every size the icon is actually used.
 */
const FOLD = [224, 162, 26]; // #e0a21a

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

const crc32 = (buffer) => {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
};

const encodePng = (width, height, rgba) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // One filter byte (0 = none) per scanline.
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

const mix = (a, b, t) => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

/**
 * The mark's geometry, in coordinates local to the sheet.
 *
 * `0,0` is the sheet's top-left corner and `1,1` its bottom-right, so one set
 * of numbers draws the icon at 180px and at 512px with nothing to rescale by
 * hand. They are the SVG mark's own paths — see `StudioMark` and
 * `StudioLetter` — divided through by the sheet's size, which is what keeps the
 * installed-app icon and the in-app mark the same drawing rather than two
 * drawings that look similar.
 */

/** The sheet's outline, the cut edge bowing inward where the corner rolls away. */
const FACE = [
  ['M', 0, 0],
  ['L', 1, 0],
  ['L', 1, 0.6945],
  ['C', 0.863, 0.7309, 0.7037, 0.8509, 0.6704, 1],
  ['L', 0, 1],
];

/** The rolled-under flap. Bulges a little past the sheet's right edge, as paper does. */
const FLAP = [
  ['M', 1, 0.6945],
  ['C', 0.863, 0.7309, 0.7037, 0.8509, 0.6704, 1],
  ['C', 0.9037, 0.9636, 1.0259, 0.8545, 1, 0.6945],
];

/**
 * The letter, carried over from `StudioLetter`'s 24-unit box.
 *
 * Placed exactly as the in-app mark places it: `translate(3.2 3.1) scale(0.85)`
 * in sheet units, then divided by the sheet's 27 × 27.5.
 */
const letterPoint = (u, v) => [(3.2 + 0.85 * u) / 27, (3.1 + 0.85 * v) / 27.5];

const STEM = [
  ['M', ...letterPoint(12, 2.2)],
  ['C', ...letterPoint(11.4, 8), ...letterPoint(11.5, 14.5), ...letterPoint(12.3, 18.2)],
  ['C', ...letterPoint(12.8, 20.9), ...letterPoint(15.6, 21.8), ...letterPoint(17.8, 20)],
];

const BAR = [
  ['M', ...letterPoint(5.4, 11.3)],
  ['C', ...letterPoint(8.6, 10.6), ...letterPoint(14, 9.9), ...letterPoint(17.9, 9.5)],
];

/**
 * Half the letter's stroke, in sheet units.
 *
 * A shade heavier than the SVG mark's 3.06/27, for the reason given on
 * `StudioLetter.strokeWidth`: this file's output is looked at at 16px in a
 * browser tab, where a stroke that measures right measures one pixel.
 */
const INK_HALF_WIDTH = 0.066;

/** Beziers, flattened. Sixteen steps is past the point any of these bends. */
const flatten = (commands) => {
  const points = [];
  let cursor = [0, 0];

  for (const [kind, ...args] of commands) {
    if (kind === 'M') {
      cursor = [args[0], args[1]];
      points.push(cursor);
    } else if (kind === 'L') {
      cursor = [args[0], args[1]];
      points.push(cursor);
    } else {
      const [c1x, c1y, c2x, c2y, x, y] = args;
      const [x0, y0] = cursor;
      for (let step = 1; step <= 16; step += 1) {
        const t = step / 16;
        const m = 1 - t;
        points.push([
          m * m * m * x0 + 3 * m * m * t * c1x + 3 * m * t * t * c2x + t * t * t * x,
          m * m * m * y0 + 3 * m * m * t * c1y + 3 * m * t * t * c2y + t * t * t * y,
        ]);
      }
      cursor = [x, y];
    }
  }

  return points;
};

const FACE_POLY = flatten(FACE);
const FLAP_POLY = flatten(FLAP);
const STROKES = [flatten(STEM), flatten(BAR)];

/** Even-odd crossing test. The outlines are closed implicitly. */
const inPolygon = (x, y, polygon) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

/** Whether a point falls inside a stroked polyline of half-width `half`. */
const onStroke = (x, y, polyline, half) => {
  for (let i = 1; i < polyline.length; i += 1) {
    const [ax, ay] = polyline[i - 1];
    const [bx, by] = polyline[i];
    const dx = bx - ax;
    const dy = by - ay;
    const lengthSquared = dx * dx + dy * dy;
    let t = lengthSquared === 0 ? 0 : ((x - ax) * dx + (y - ay) * dy) / lengthSquared;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const px = ax + t * dx - x;
    const py = ay + t * dy - y;
    if (px * px + py * py <= half * half) return true;
  }
  return false;
};

/**
 * A Post-it note on a brand tile, drawn straight into an RGBA buffer.
 *
 * ## Why it is supersampled
 *
 * Every edge in this drawing is a diagonal or a curve — the tile's rounded
 * corners, the sheet's rolled edge, and now a handwritten letter. Sampled once
 * per pixel they come out as staircases, which was tolerable while the sheet
 * was a rectangle with three straight rules on it and is not now. Four samples
 * per axis is sixteen per pixel: enough that a curve at 180px is smooth, cheap
 * enough that the whole set still generates in a couple of seconds, and it
 * costs nothing at runtime because this runs at build time and ships PNGs.
 */
const drawIcon = (size, { maskable = false } = {}) => {
  const pixels = Buffer.alloc(size * size * 4);
  const radius = maskable ? 0 : size * 0.22;
  // Maskable icons need a safe area; a plain tile can run closer to the edge.
  const pad = maskable ? size * 0.2 : size * 0.14;
  const samples = 4;

  const inRoundedRect = (x, y) => {
    if (radius === 0) return true;
    const min = radius;
    const max = size - radius;
    const cx = x < min ? min : x > max ? max : x;
    const cy = y < min ? min : y > max ? max : y;
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
  };

  const paperLeft = pad;
  const paperTop = pad;
  const paperSize = size - pad * 2;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const px = x + (sx + 0.5) / samples;
          const py = y + (sy + 0.5) / samples;

          if (!inRoundedRect(px, py)) continue;

          // Brand tile behind the paper.
          let colour = mix(BRAND, BRAND_DEEP, py / size);

          // Sheet-local, so the geometry above applies unchanged at any size.
          const u = (px - paperLeft) / paperSize;
          const v = (py - paperTop) / paperSize;

          if (u >= -0.05 && u <= 1.08 && v >= -0.05 && v <= 1.05) {
            if (inPolygon(u, v, FACE_POLY)) {
              colour = mix(PAPER_TOP, PAPER_BOTTOM, v);
              if (STROKES.some((stroke) => onStroke(u, v, stroke, INK_HALF_WIDTH))) {
                colour = INK;
              }
            } else if (inPolygon(u, v, FLAP_POLY)) {
              colour = FOLD;
            }
          }

          r += colour[0];
          g += colour[1];
          b += colour[2];
          a += 255;
        }
      }

      const taken = samples * samples;
      const offset = (y * size + x) * 4;
      // Averaged over *covered* samples so a partly-covered edge pixel keeps
      // its colour and only loses alpha — averaging over all of them would
      // darken every rounded corner towards black.
      const covered = a / 255;
      pixels[offset] = covered ? Math.round(r / covered) : 0;
      pixels[offset + 1] = covered ? Math.round(g / covered) : 0;
      pixels[offset + 2] = covered ? Math.round(b / covered) : 0;
      pixels[offset + 3] = Math.round(a / taken);
    }
  }

  return encodePng(size, size, pixels);
};

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="tile" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0e7490"/>
      <stop offset="1" stop-color="#155e75"/>
    </linearGradient>
    <linearGradient id="paper" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fcc74b"/>
      <stop offset="1" stop-color="#f3ae1c"/>
    </linearGradient>
  </defs>

  <rect width="64" height="64" rx="14" fill="url(#tile)"/>

  <!-- The same sheet the app draws, with its bottom-right corner rolled under
       and the product's initial on it. The tile stays: at 16px in a tab strip a
       bare yellow note has to survive whatever colour sits behind it, and a
       dark surround is what makes the gold read on a light theme and a dark
       one alike. -->
  <g transform="rotate(-4 32 32)">
    <path d="M10 9h44v31.9c-6 1.7-13 7.2-14.5 14.1H10V9Z" fill="url(#paper)"/>
    <path d="M54 41c-6 1.7-13 7.2-14.5 14.1 10.3-1.7 15.6-6.7 14.5-14.1Z" fill="#e0a21a"/>
    <g
      transform="translate(15.9 15.3) scale(1.33)"
      fill="none"
      stroke="#26384b"
      stroke-width="4.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M12 2.2C11.4 8 11.5 14.5 12.3 18.2c.5 2.7 3.3 3.6 5.5 1.8"/>
      <path d="M5.4 11.3c3.2-.7 8.6-1.4 12.5-1.8"/>
    </g>
  </g>
</svg>
`;

mkdirSync(ICONS_DIR, { recursive: true });

writeFileSync(join(ICONS_DIR, 'icon-192.png'), drawIcon(192));
writeFileSync(join(ICONS_DIR, 'icon-512.png'), drawIcon(512));
writeFileSync(join(ICONS_DIR, 'maskable-512.png'), drawIcon(512, { maskable: true }));
writeFileSync(join(PUBLIC_DIR, 'apple-touch-icon.png'), drawIcon(180, { maskable: true }));
writeFileSync(join(PUBLIC_DIR, 'favicon.svg'), FAVICON_SVG);

console.log('Wrote icons/icon-192.png, icons/icon-512.png, icons/maskable-512.png,');
console.log('apple-touch-icon.png and favicon.svg into public/.');
