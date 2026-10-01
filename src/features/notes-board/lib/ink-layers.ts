import type { WhiteboardStrokeData } from '@/entities/chat/model/types';
import { paintStroke } from './ink-geometry';

/**
 * The shared wall's ink, split across layers so a frame repaints only what changed in it. One
 * `<canvas>`, cleared and repainted from the full stroke list on every pointer sample.
 */
/**
 * One committed stroke, as the layers keep it. `id` is the saved element's id — `null` for this
 * client's own stroke until the server acknowledges it — and `at` is when it was drawn.
 */
export interface InkEntry {
  id: string | null;
  at: number;
  stroke: WhiteboardStrokeData;
}

export interface InkLayers {
  /** Points the renderer at the current canvases. The stage swaps them on full screen. */
  attach: (base: HTMLCanvasElement | null, live: HTMLCanvasElement | null) => void;
  /** Re-measures the canvases; a changed size repaints the committed layer once. */
  resize: () => void;
  /** Replaces the committed ink wholesale: a scene load, a refetch, a clear. */
  setCommitted: (entries: InkEntry[]) => void;
  /** Appends one committed stroke, painting only that stroke. */
  commit: (entry: InkEntry) => void;
  /**
   * Takes strokes off the wall — undo, or a teammate's undo arriving. By id, or by the entry itself
   * for a stroke whose id has not come back yet.
   */
  remove: (target: { ids?: readonly string[]; entry?: InkEntry }) => void;
  /** Puts strokes back in drawing order — redo. Also a full repaint, once. */
  restore: (entries: InkEntry[]) => void;
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
  let committed: InkEntry[] = [];
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

  /** Repaints the base from the stroke list. The slow path: load, resize, undo and redo only. */
  const rebuildBase = () => {
    releaseCache();
    if (base) paintAll(base, committed.map((entry) => entry.stroke));
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
        paintAll(cache, committed.map((entry) => entry.stroke));
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
    setCommitted: (entries) => {
      committed = entries;
      rebuildBase();
      schedule({ base: true, live: true });
    },
    remove: ({ ids, entry }) => {
      const drop = new Set(ids ?? []);
      const before = committed.length;
      committed = committed.filter(
        (candidate) => candidate !== entry && !(candidate.id !== null && drop.has(candidate.id)),
      );
      if (committed.length === before) return;
      rebuildBase();
      schedule({ base: true });
    },
    restore: (entries) => {
      const present = new Set(committed);
      const presentIds = new Set(committed.map((candidate) => candidate.id).filter(Boolean));
      const fresh = entries.filter(
        (candidate) =>
          !present.has(candidate) && !(candidate.id !== null && presentIds.has(candidate.id)),
      );
      if (fresh.length === 0) return;
      // Stable by `at`, so strokes drawn in the same millisecond keep their order.
      committed = [...committed, ...fresh].sort((left, right) => left.at - right.at);
      rebuildBase();
      schedule({ base: true });
    },
    commit: (entry) => {
      committed.push(entry);
      const { stroke } = entry;

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
