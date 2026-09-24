import type { WhiteboardStrokeData } from '@/entities/chat/model/types';
import { paintStroke } from './ink-geometry';

/**
 * The shared wall's ink, split across layers so a frame repaints only what
 * changed in it.
 *
 * ## What this replaced
 *
 * One `<canvas>`, cleared and repainted from the full stroke list on every
 * pointer sample — every committed stroke on the board, up to the five
 * thousand the scene endpoint returns, re-stroked sixty-plus times a second
 * while anybody drew. It was also scheduled once per pointer *event* rather
 * than once per frame, and repainted synchronously on every incoming frame of a
 * teammate's ink, so two people drawing at once could repaint the whole board
 * several times inside one frame. The cost grew with the history of the wall,
 * not with what was happening on it.
 *
 * ## The layers
 *
 *   - **base** (visible): every committed stroke, painted once. A new
 *     committed stroke is painted on top of it and nothing else is touched —
 *     strokes are append-only and an eraser only affects what is under it, so
 *     painting one more stroke onto the existing pixels is exactly what a full
 *     repaint with that stroke appended would produce.
 *   - **live** (visible, above base): the strokes still being drawn — this
 *     client's own and teammates' ghosts. Cleared and repainted per frame, but
 *     it only ever holds a handful of short paths.
 *   - **cache** (offscreen, only while a rubber is moving): see below.
 *
 * ## Why an eraser in progress needs the cache
 *
 * A pen stroke in progress can sit on its own layer because it only *adds*
 * ink. A rubber has to visibly take ink off the committed layer as it moves,
 * and `destination-out` on the live layer would rub out nothing but the live
 * layer. Painting it destructively onto the base instead cannot be undone if
 * the stroke is then discarded.
 *
 * So while any eraser is in progress, the base's committed pixels are kept in
 * an offscreen copy, and each frame the base is the copy blitted back plus the
 * erasers on top. One `drawImage` is a texture copy on the GPU, which is still
 * nothing next to re-stroking the whole history. The copy is taken from the
 * base itself (another blit, not a repaint) and dropped as soon as the last
 * rubber lifts, so a board costs its third canvas's memory only while somebody
 * is actually erasing.
 */
export interface InkLayers {
  /** Points the renderer at the current canvases. The stage swaps them on full screen. */
  attach: (base: HTMLCanvasElement | null, live: HTMLCanvasElement | null) => void;
  /** Re-measures the canvases; a changed size repaints the committed layer once. */
  resize: () => void;
  /** Replaces the committed ink wholesale: a scene load, a refetch, a clear. */
  setCommitted: (strokes: WhiteboardStrokeData[]) => void;
  /** Appends one committed stroke, painting only that stroke. */
  commit: (stroke: WhiteboardStrokeData) => void;
  /** Teammates' strokes in progress. */
  setRemote: (strokes: readonly WhiteboardStrokeData[]) => void;
  /** This client's own stroke in progress, or `null` when the pointer is up. */
  setLocal: (stroke: WhiteboardStrokeData | null) => void;
  /** The local stroke gained points. Mutated in place by the caller, so this is the only signal. */
  touchLocal: () => void;
  dispose: () => void;
}

const context2d = (canvas: HTMLCanvasElement | null) => {
  const context = canvas?.getContext('2d');
  if (!context) return null;
  // Reset by every resize, so set on every use rather than once.
  context.lineCap = 'round';
  context.lineJoin = 'round';
  return context;
};

export const createInkLayers = (): InkLayers => {
  let base: HTMLCanvasElement | null = null;
  let live: HTMLCanvasElement | null = null;
  let cache: HTMLCanvasElement | null = null;

  let ratio = 1;
  let committed: WhiteboardStrokeData[] = [];
  let remote: readonly WhiteboardStrokeData[] = [];
  let local: WhiteboardStrokeData | null = null;

  /** Whether the base holds exactly the committed ink, with no rubber composited onto it. */
  let isBaseClean = true;
  let isBaseDirty = false;
  let isLiveDirty = false;
  let frame = 0;

  const erasersInProgress = () => {
    const found = remote.filter((stroke) => stroke.erase);
    if (local?.erase) found.push(local);
    return found;
  };

  const paintAll = (canvas: HTMLCanvasElement, strokes: readonly WhiteboardStrokeData[]) => {
    const context = context2d(canvas);
    if (!context) return;

    context.globalCompositeOperation = 'source-over';
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of strokes) {
      paintStroke(context, stroke, canvas.width, canvas.height, ratio);
    }
    // Never leave a context in erase mode for whoever touches it next.
    context.globalCompositeOperation = 'source-over';
  };

  const releaseCache = () => {
    if (!cache) return;
    // A zero-sized canvas is how a browser is told to free the backing store
    // now rather than whenever the element is collected.
    cache.width = 0;
    cache.height = 0;
    cache = null;
  };

  /** Repaints the base from the stroke list. The slow path, taken on load and resize only. */
  const rebuildBase = () => {
    releaseCache();
    if (base) paintAll(base, committed);
    isBaseClean = true;
  };

  const renderBase = () => {
    if (!base) return;
    const context = context2d(base);
    if (!context) return;

    const erasers = erasersInProgress();

    if (erasers.length === 0) {
      if (cache) {
        // The last rubber lifted. Whatever it committed is already in the
        // cache (see `commit`), so the cache *is* the settled base.
        context.globalCompositeOperation = 'source-over';
        context.clearRect(0, 0, base.width, base.height);
        context.drawImage(cache, 0, 0);
        releaseCache();
        isBaseClean = true;
      } else if (!isBaseClean) {
        rebuildBase();
      }
      return;
    }

    if (!cache) {
      cache = document.createElement('canvas');
      cache.width = base.width;
      cache.height = base.height;
      if (isBaseClean) {
        cache.getContext('2d')?.drawImage(base, 0, 0);
      } else {
        paintAll(cache, committed);
      }
    }

    context.globalCompositeOperation = 'source-over';
    context.clearRect(0, 0, base.width, base.height);
    context.drawImage(cache, 0, 0);
    for (const stroke of erasers) paintStroke(context, stroke, base.width, base.height, ratio);
    context.globalCompositeOperation = 'source-over';
    isBaseClean = false;
  };

  const renderLive = () => {
    if (!live) return;
    const pens = remote.filter((stroke) => !stroke.erase);
    if (local && !local.erase) pens.push(local);
    paintAll(live, pens);
  };

  const flush = () => {
    frame = 0;
    if (isBaseDirty) {
      isBaseDirty = false;
      renderBase();
    }
    if (isLiveDirty) {
      isLiveDirty = false;
      renderLive();
    }
  };

  /** At most one paint per layer per frame, however many changes arrive inside it. */
  const schedule = (layers: { base?: boolean; live?: boolean }) => {
    if (layers.base) isBaseDirty = true;
    if (layers.live) isLiveDirty = true;
    if (!frame) frame = requestAnimationFrame(flush);
  };

  const resize = (force = false) => {
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const nextRatio = window.devicePixelRatio || 1;
    const width = Math.round(rect.width * nextRatio);
    const height = Math.round(rect.height * nextRatio);

    // Assigning a canvas's size clears it even when the value is unchanged,
    // which is why an unchanged measurement must not touch it.
    if (!force && width === base.width && height === base.height && nextRatio === ratio) return;

    ratio = nextRatio;
    base.width = width;
    base.height = height;
    if (live) {
      live.width = width;
      live.height = height;
    }

    rebuildBase();
    schedule({ base: true, live: true });
  };

  return {
    attach: (nextBase, nextLive) => {
      base = nextBase;
      live = nextLive;
      releaseCache();
      resize(true);
    },
    resize: () => resize(false),
    setCommitted: (strokes) => {
      committed = strokes;
      rebuildBase();
      schedule({ base: true, live: true });
    },
    commit: (stroke) => {
      committed.push(stroke);

      if (cache) {
        // A rubber is being composited over the base, so the settled pixels
        // live in the cache for now; the next frame re-composites from it.
        const context = context2d(cache);
        if (context) {
          paintStroke(context, stroke, cache.width, cache.height, ratio);
          context.globalCompositeOperation = 'source-over';
        }
        schedule({ base: true });
        return;
      }

      const context = context2d(base);
      if (!context || !base) return;
      paintStroke(context, stroke, base.width, base.height, ratio);
      context.globalCompositeOperation = 'source-over';
    },
    setRemote: (strokes) => {
      remote = strokes;
      schedule({ base: true, live: true });
    },
    setLocal: (stroke) => {
      local = stroke;
      schedule({ base: true, live: true });
    },
    touchLocal: () => {
      schedule(local?.erase ? { base: true } : { live: true });
    },
    dispose: () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      releaseCache();
    },
  };
};
