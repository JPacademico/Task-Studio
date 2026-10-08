/**
 * Generates the PWA icon set, the favicon and the OAuth branding images without any image
 * dependency. iOS/Safari refuses to install a PWA whose manifest icons 404.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = join(ROOT, 'public');
const ICONS_DIR = join(PUBLIC_DIR, 'icons');
const BRANDING_DIR = join(ROOT, 'branding');

/* The design team's two colours. Ink and tile share one black so the letters read as cut out. */
const GOLD = [216, 192, 82]; // #d8c052
const INK = [15, 15, 18]; // #0f0f12, the manifest's background_color

/*
 * The mark's geometry in its 40-unit box, kept in step with `studio-monogram.tsx`. The T has a
 * ring round the S cut out of it; the ring is wider for smaller renders.
 */
const SHEET =
  'M4 4H34V23C34 25.4 32.75 27.85 30.5 28.76C29.58 29.16 28.6 29.15 27.5 29.15' +
  'C26.6 30.6 25.4 31.6 23.6 32.4C21.2 33.5 18.2 34 14.4 34H4Z';
const BRACKET = 'M35 6H36V36H6V35H35Z';
const S_GLYPH =
  'M16.04 21.36H21.65C21.87 21.56 21.83 22.47 22.66 22.55C23.5 22.63 24.37 21.88 23.51 21.18' +
  'C22.82 20.63 21.73 20.61 20.9 20.46C19.07 20.14 16.9 19.43 16.27 17.48C16.1 16.94 16.09 16.39 16.1 15.82' +
  'C16.12 15.13 16.32 14.48 16.71 13.91C18.51 11.3 24 11.19 26.63 12.41C27.83 12.97 28.77 13.96 29.14 15.25' +
  'C29.24 15.62 29.3 16.06 29.3 16.5H23.87C23.6 16.18 23.79 15.51 22.79 15.42C22.14 15.36 21.26 16 21.89 16.64' +
  'C22.55 17.3 24.09 17.34 24.97 17.51C27.52 18 29.9 19.34 29.56 22.31C29.49 22.97 29.24 23.61 28.86 24.15' +
  'C27.03 26.77 21.35 26.78 18.73 25.53C17.42 24.9 16.42 23.84 16.1 22.41C16.03 22.11 16 21.7 16.04 21.36Z';
const T_CUT = {
  // The art's own ring, for renders big enough to hold it.
  0.3:
    'M8.35 11.7H19.73Q17.48 12.27 16.46 13.74Q15.83 14.66 15.8 15.81Q15.78 16.92 15.98 17.57' +
    'Q16.35 18.7 17.4 19.47V21.06H16.04Q15.77 21.06 15.74 21.32Q15.67 21.9 15.81 22.48' +
    'Q16.16 24.04 17.4 25.05V26H12.45V16.2H8.35Z',
  0.6:
    'M8.35 11.7H18.73Q17.07 12.33 16.21 13.57Q15.54 14.56 15.5 15.81Q15.48 16.97 15.7 17.66' +
    'Q16.13 18.99 17.4 19.83V20.76H16.04Q15.51 20.76 15.44 21.29Q15.37 21.92 15.51 22.54' +
    'Q15.91 24.33 17.4 25.43V26H12.45V16.2H8.35Z',
  1.0:
    'M8.35 11.7H17.76Q16.58 12.33 15.88 13.35Q15.14 14.43 15.1 15.8Q15.08 17.03 15.32 17.79' +
    'Q15.83 19.36 17.4 20.31V20.36H16.04Q15.15 20.36 15.05 21.24Q14.96 21.94 15.12 22.63' +
    'Q15.59 24.7 17.4 25.92V26H12.45V16.2H8.35Z',
};

/** The mark's outer box: sheet top-left to the bracket's far corner. */
const MARK_BOX = { x: 4, y: 4, size: 32 };

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

/** An absolute SVG path (M L H V C Q Z) flattened to closed polygons, with its bounding box. */
const flattenPath = (d) => {
  const polygons = [];
  let points = [];
  let x = 0;
  let y = 0;

  for (const [, kind, args] of d.matchAll(/([MLHVCQZ])([^MLHVCQZ]*)/g)) {
    const n = (args.match(/-?\d*\.?\d+/g) ?? []).map(Number);
    if (kind === 'M') {
      if (points.length) polygons.push(points);
      [x, y] = n;
      points = [[x, y]];
    } else if (kind === 'L') {
      [x, y] = n;
      points.push([x, y]);
    } else if (kind === 'H') {
      [x] = n;
      points.push([x, y]);
    } else if (kind === 'V') {
      [y] = n;
      points.push([x, y]);
    } else if (kind === 'C' || kind === 'Q') {
      const steps = 24;
      for (let step = 1; step <= steps; step += 1) {
        const t = step / steps;
        const m = 1 - t;
        points.push(
          kind === 'C'
            ? [0, 1].map((axis) => m ** 3 * [x, y][axis] + 3 * m * m * t * n[axis] + 3 * m * t * t * n[2 + axis] + t ** 3 * n[4 + axis])
            : [0, 1].map((axis) => m * m * [x, y][axis] + 2 * m * t * n[axis] + t * t * n[2 + axis]),
        );
      }
      [x, y] = kind === 'C' ? [n[4], n[5]] : [n[2], n[3]];
    } else if (points.length) {
      polygons.push(points);
      points = [];
    }
  }
  if (points.length) polygons.push(points);

  const all = polygons.flat();
  const box = {
    minX: Math.min(...all.map(([px]) => px)),
    maxX: Math.max(...all.map(([px]) => px)),
    minY: Math.min(...all.map(([, py]) => py)),
    maxY: Math.max(...all.map(([, py]) => py)),
  };
  return { polygons, box };
};

/** Even-odd crossing test across every subpath, after a bounding-box check. */
const inShape = (px, py, { polygons, box }) => {
  if (px < box.minX || px > box.maxX || py < box.minY || py > box.maxY) return false;
  let inside = false;
  for (const polygon of polygons) {
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
};

const SHAPES = {
  sheet: flattenPath(SHEET),
  bracket: flattenPath(BRACKET),
  s: flattenPath(S_GLYPH),
  t: Object.fromEntries(Object.entries(T_CUT).map(([ring, d]) => [ring, flattenPath(d)])),
};

/**
 * The mark drawn straight into an RGBA buffer. `pad` is the margin round the mark as a share of
 * the canvas; `tiled` lays the black tile behind it, as the art itself is drawn.
 */
const drawIcon = (size, { tiled = false, pad = 0.04, ring = 0.3 } = {}) => {
  const pixels = Buffer.alloc(size * size * 4);
  const samples = 4;
  const scale = (size * (1 - pad * 2)) / MARK_BOX.size;
  const offset = size * pad;
  const tShape = SHAPES.t[ring];

  /** What lies at a canvas point, mapped into the mark's own 40-unit box. */
  const colourAt = (cx, cy) => {
    const u = MARK_BOX.x + (cx - offset) / scale;
    const v = MARK_BOX.y + (cy - offset) / scale;
    if (inShape(u, v, SHAPES.sheet)) {
      return inShape(u, v, tShape) || inShape(u, v, SHAPES.s) ? INK : GOLD;
    }
    if (inShape(u, v, SHAPES.bracket)) return GOLD;
    return tiled ? INK : null;
  };

  // Sampled once per pixel corner; only pixels whose corners disagree get supersampled.
  const corners = Array.from({ length: (size + 1) ** 2 }, (_, i) =>
    colourAt(i % (size + 1), Math.floor(i / (size + 1))),
  );

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      const top = y * (size + 1) + x;
      const corner = corners[top];
      const uniform =
        corner === corners[top + 1] &&
        corner === corners[top + size + 1] &&
        corner === corners[top + size + 2];

      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const colour = uniform
            ? corner
            : colourAt(x + (sx + 0.5) / samples, y + (sy + 0.5) / samples);
          if (!colour) continue;

          r += colour[0];
          g += colour[1];
          b += colour[2];
          a += 255;
        }
      }

      const taken = samples * samples;
      const index = (y * size + x) * 4;
      // Averaged over covered samples, so a part-covered edge keeps its colour and only loses alpha.
      const covered = a / 255;
      pixels[index] = covered ? Math.round(r / covered) : 0;
      pixels[index + 1] = covered ? Math.round(g / covered) : 0;
      pixels[index + 2] = covered ? Math.round(b / covered) : 0;
      pixels[index + 3] = Math.round(a / taken);
    }
  }

  return encodePng(size, size, pixels);
};

/*
 * The favicon is tuned for 16-32px rather than scaled down: a tighter box, a bracket twice the
 * weight, and the widest ring between the letters.
 */
const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="3.2 3.2 35 35">
  <path d="M35.4 6H37.4V37.4H6V35.4H35.4Z" fill="#d8c052"/>
  <path d="${SHEET}" fill="#d8c052"/>
  <path d="${T_CUT[1.0]}${S_GLYPH}" fill="#0f0f12"/>
</svg>
`;

mkdirSync(ICONS_DIR, { recursive: true });
mkdirSync(BRANDING_DIR, { recursive: true });

// The `any` icons are the mark on nothing: the launcher supplies its own background.
writeFileSync(join(ICONS_DIR, 'icon-192.png'), drawIcon(192));
writeFileSync(join(ICONS_DIR, 'icon-512.png'), drawIcon(512));
// Maskable: the whole mark inside the 40%-radius safe circle, on the art's own black.
writeFileSync(join(ICONS_DIR, 'maskable-512.png'), drawIcon(512, { tiled: true, pad: 0.22 }));
writeFileSync(join(PUBLIC_DIR, 'apple-touch-icon.png'), drawIcon(180, { tiled: true, pad: 0.17 }));
writeFileSync(join(PUBLIC_DIR, 'favicon.svg'), FAVICON_SVG);
// What Google's consent screen asks for, and a large copy for everywhere else.
writeFileSync(join(BRANDING_DIR, 'google-oauth-logo-120.png'), drawIcon(120, { tiled: true, pad: 0.16, ring: 0.6 }));
writeFileSync(join(BRANDING_DIR, 'task-studio-logo-512.png'), drawIcon(512, { tiled: true, pad: 0.16 }));

console.log('Wrote icons/icon-192.png, icons/icon-512.png, icons/maskable-512.png,');
console.log('apple-touch-icon.png and favicon.svg into public/, and the two branding/ logos.');
