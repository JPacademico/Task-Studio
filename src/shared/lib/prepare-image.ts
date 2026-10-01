/**
 * Shrinking an image before it ever leaves the browser. Until this existed, whatever the file
 * picker handed back went straight to R2.
 */

/** Long-edge ceilings. Anything already smaller is left alone. */
const DISPLAY_EDGE = 1600;
const THUMB_EDGE = 480;

/**
 * 0.82 is where WebP stops being visibly lossy for photographs and starts costing real bytes for
 * nothing.
 */
const DISPLAY_QUALITY = 0.82;
const THUMB_QUALITY = 0.75;

export interface PreparedImage {
  /** Full-size rendition, WebP. */
  display: Blob;
  /**
   * Small rendition for boards and grids, WebP. Null unless asked for. Producing it is a second
   * encode of the same bitmap, and — more to the point.
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
 * Draws a bitmap at a given size and encodes it. `OffscreenCanvas` where it exists — it keeps the
 * work off the main thread's layout path.
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
 * Decodes, downscales and re-encodes a picked file into two WebP renditions. Throws if the file is
 * not a decodable image.
 */
export const prepareImage = async (
  file: File,
  { thumbnail = false }: PrepareOptions = {},
): Promise<PreparedImage> => {
  const bitmap = await createImageBitmap(file);

  try {
    const display = scaleToFit(bitmap.width, bitmap.height, DISPLAY_EDGE);

    // Sequential rather than `Promise.all` when both are wanted: the encodes are CPU-bound on one
    // thread, so running them together finishes no sooner and holds two full-size bitmaps at once.
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
