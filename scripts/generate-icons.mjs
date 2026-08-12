/**
 * Generates the PWA icon set without any image dependency.
 *
 * iOS/Safari refuses to install a PWA whose manifest icons 404, and a binary
 * asset does not belong in source control, so the icons are produced from code:
 * a Post-it note — the object the whole app is built around — with a peeled
 * corner and ruled lines, encoded as PNG by hand.
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

const BRAND = [99, 102, 241]; // #6366f1
const BRAND_DEEP = [79, 70, 229]; // #4f46e5

// Post-it palette: a warm yellow sheet, a shaded fold, and ink for the lines.
const PAPER_TOP = [253, 224, 138]; // #fde08a
const PAPER_BOTTOM = [250, 204, 90]; // #facc5a
const FOLD = [225, 170, 52]; // shaded underside of the curl
const LINE_INK = [124, 92, 20];

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
 * A Post-it note on a brand tile, drawn straight into an RGBA buffer.
 *
 * The sheet is square with its bottom-right corner peeled away: the triangle
 * below the diagonal is cut out of the paper and redrawn a few shades darker,
 * which is what reads as a fold at 16px without any real shading.
 */
const drawIcon = (size, { maskable = false } = {}) => {
  const pixels = Buffer.alloc(size * size * 4);
  const radius = maskable ? 0 : size * 0.22;
  // Maskable icons need a safe area; a plain tile can run closer to the edge.
  const pad = maskable ? size * 0.2 : size * 0.14;

  const inRoundedRect = (x, y) => {
    if (radius === 0) return true;
    const min = radius;
    const max = size - radius;
    const cx = x < min ? min : x > max ? max : x;
    const cy = y < min ? min : y > max ? max : y;
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
  };

  // Paper geometry.
  const paperLeft = pad;
  const paperRight = size - pad;
  const paperTop = pad;
  const paperBottom = size - pad;
  const paperSize = paperRight - paperLeft;
  const foldSize = paperSize * 0.32;

  // Three ruled lines, skipping the corner the fold eats.
  const lineHeight = Math.max(1, Math.round(paperSize * 0.045));
  const lines = [0.24, 0.42, 0.6, 0.78].map((at) => paperTop + paperSize * at);
  const lineLeft = paperLeft + paperSize * 0.14;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const px = x + 0.5;
      const py = y + 0.5;

      if (!inRoundedRect(px, py)) {
        pixels[offset + 3] = 0;
        continue;
      }

      // Brand tile behind the paper.
      let colour = mix(BRAND, BRAND_DEEP, y / size);

      const onPaper =
        px >= paperLeft && px <= paperRight && py >= paperTop && py <= paperBottom;

      if (onPaper) {
        // Everything past this diagonal is the dog-eared corner: the near half
        // is the paper's shaded underside, the far half is gone entirely and
        // lets the tile show through.
        const foldEdge = paperRight + paperBottom - foldSize;
        const isCutAway = px + py > foldEdge;
        const isFold = isCutAway && px + py < foldEdge + foldSize * 0.55;

        if (isFold) {
          colour = FOLD;
        } else if (!isCutAway) {
          colour = mix(PAPER_TOP, PAPER_BOTTOM, (py - paperTop) / paperSize);

          const lineRight =
            // Lines stop short of the fold so they never run into it.
            Math.min(paperRight - paperSize * 0.16, foldEdge - py - paperSize * 0.08);

          for (const lineY of lines) {
            if (py >= lineY && py < lineY + lineHeight && px >= lineLeft && px <= lineRight) {
              colour = LINE_INK;
              break;
            }
          }
        }
      }

      pixels[offset] = colour[0];
      pixels[offset + 1] = colour[1];
      pixels[offset + 2] = colour[2];
      pixels[offset + 3] = 255;
    }
  }

  return encodePng(size, size, pixels);
};

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="tile" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6366f1"/>
      <stop offset="1" stop-color="#4f46e5"/>
    </linearGradient>
    <linearGradient id="paper" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fde08a"/>
      <stop offset="1" stop-color="#facc5a"/>
    </linearGradient>
  </defs>

  <rect width="64" height="64" rx="14" fill="url(#tile)"/>

  <!-- The sheet, with its bottom-right corner peeled away. -->
  <g transform="rotate(-4 32 32)">
    <path d="M10 9h44v33L44 55H10V9Z" fill="url(#paper)"/>
    <path d="M44 55V42h10L44 55Z" fill="#e1aa34"/>
    <g stroke="#7c5c14" stroke-width="3.6" stroke-linecap="round" opacity="0.85">
      <line x1="18" y1="21" x2="46" y2="21"/>
      <line x1="18" y1="30" x2="46" y2="30"/>
      <line x1="18" y1="39" x2="38" y2="39"/>
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
