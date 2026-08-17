/**
 * Shrinking an image before it ever leaves the browser.
 *
 * Until this existed, whatever the file picker handed back went straight to R2:
 * a modern phone photo is around 4000×3000 and three to five megabytes, and it
 * was being stored at that size and downloaded at that size to render a 220×220
 * Post-it. Roughly three hundred times the pixels the interface can draw.
 *
 * That cost is paid three separate times — R2 storage, the viewer's download,
 * and the decode on every render — and the last two are the ones people
 * actually feel, because a board with a dozen image notes is a board decoding a
 * dozen full-resolution photographs.
 *
 * Doing it here rather than on the API is deliberate and not just convenient.
 * The whole upload design exists so bytes never transit the server (see
 * `uploadImage`); resizing there would put them straight back through it, on a
 * 512 MB free-tier container, and serialise every upload behind one CPU.
 * The browser already has the decoder, the GPU and the idle time.
 *
 * ## What comes out
 *
 * Two renditions, because one size cannot serve both jobs:
 *
 *   - **display** — capped at 1600px on the long edge. What you get when you
 *     open an image, and what a document body references.
 *   - **thumb** — capped at 480px. What a board note or a grid cell draws. At
 *     220px on screen this still has enough for a 2× display.
 *
 * Always re-encoded to WebP, which the API already allows. Two useful
 * side-effects fall out of the canvas round-trip for free: the metadata is
 * gone, so a photograph stops carrying the GPS coordinates of where it was
 * taken, and an animated GIF becomes a single still frame rather than a
 * multi-megabyte loop.
 */

/** Long-edge ceilings. Anything already smaller is left alone. */
const DISPLAY_EDGE = 1600;
const THUMB_EDGE = 480;

/**
 * 0.82 is where WebP stops being visibly lossy for photographs and starts
 * costing real bytes for nothing. Below about 0.75 gradients begin to band,
 * which is very visible on the flat colour fields this app is full of.
 */
const DISPLAY_QUALITY = 0.82;
const THUMB_QUALITY = 0.75;

export interface PreparedImage {
  /** Full-size rendition, WebP. */
  display: Blob;
  /**
   * Small rendition for boards and grids, WebP.
   *
   * Null unless asked for. Producing it is a second encode of the same bitmap,
   * and — more to the point — *storing* it is a second object in a bucket with
   * a quota. Nothing renders it yet: `Note` has one `imageKey` column, so a
   * board note has nowhere to put a second URL. Generating one anyway would
   * spend storage and a presigned request per image to no end, on exactly the
   * budget this whole change set exists to protect.
   *
   * The capability is here because it is the natural next step and the encode
   * is the hard part; turning it on is a column, a migration and one flag.
   */
  thumb: Blob | null;
  /** Pixel dimensions of `display`, so markup can carry width/height. */
  width: number;
  height: number;
}

export interface PrepareOptions {
  /** Also produce the small rendition. See `PreparedImage.thumb`. */
  thumbnail?: boolean;
}

/** Fits `(width, height)` inside a square of `edge`, preserving aspect ratio. */
const scaleToFit = (width: number, height: number, edge: number) => {
  const longest = Math.max(width, height);
  if (longest <= edge) return { width, height };

  const ratio = edge / longest;
  // Never round to zero: a 4000×20 panorama still has to have a height.
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
};

/**
 * Draws a bitmap at a given size and encodes it.
 *
 * `OffscreenCanvas` where it exists — it keeps the work off the main thread's
 * layout path — with a plain `<canvas>` fallback for Safari versions that have
 * `createImageBitmap` but not the offscreen variant.
 */
const encodeAt = async (
  bitmap: ImageBitmap,
  width: number,
  height: number,
  quality: number,
): Promise<Blob> => {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas unavailable.');

    context.drawImage(bitmap, 0, 0, width, height);
    return canvas.convertToBlob({ type: 'image/webp', quality });
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas unavailable.');
  context.drawImage(bitmap, 0, 0, width, height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Encoding failed.'))),
      'image/webp',
      quality,
    );
  });
};

/**
 * Decodes, downscales and re-encodes a picked file into two WebP renditions.
 *
 * Throws if the file is not a decodable image, which is the caller's cue to
 * show "that is not an image we can read" rather than uploading something the
 * bucket will never be able to render.
 */
export const prepareImage = async (
  file: File,
  { thumbnail = false }: PrepareOptions = {},
): Promise<PreparedImage> => {
  const bitmap = await createImageBitmap(file);

  try {
    const display = scaleToFit(bitmap.width, bitmap.height, DISPLAY_EDGE);

    // Sequential rather than `Promise.all` when both are wanted: the encodes
    // are CPU-bound on one thread, so running them together finishes no sooner
    // and holds two full-size bitmaps at once — which is what actually kills a
    // low-end phone on a 12-megapixel photo.
    const displayBlob = await encodeAt(bitmap, display.width, display.height, DISPLAY_QUALITY);

    let thumbBlob: Blob | null = null;
    if (thumbnail) {
      const thumb = scaleToFit(bitmap.width, bitmap.height, THUMB_EDGE);
      thumbBlob = await encodeAt(bitmap, thumb.width, thumb.height, THUMB_QUALITY);
    }

    return {
      display: displayBlob,
      thumb: thumbBlob,
      width: display.width,
      height: display.height,
    };
  } finally {
    // Bitmaps hold decoded pixel buffers — several times the file size — and
    // are not collected promptly on their own.
    bitmap.close();
  }
};
