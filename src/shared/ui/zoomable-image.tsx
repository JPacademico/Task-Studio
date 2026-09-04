import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Expand, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { translate } from '@/shared/i18n';

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
/** One notch of the +/- buttons: felt, but never jarring. */
const ZOOM_STEP = 0.5;

const clamp = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, value));

interface ZoomableImageProps {
  /** Full-resolution source. Only ever requested once the viewer is opened. */
  src: string;
  /**
   * Small rendition drawn inline. Falls back to `src` for attachments uploaded
   * before thumbnails existed — correct, just not as cheap.
   */
  thumbSrc?: string | null;
  alt: string;
  /** Applied to the inline thumbnail button. */
  className?: string;
  /**
   * How much room the inline rendition is entitled to.
   *
   * `thumb` (the default) caps it at 160px: right where a picture is *part* of
   * something else — a task sheet, a card — and the click through to the
   * viewer is the real way to look at it.
   *
   * `fill` lets it take the box it is given. That is for the case where the
   * picture *is* the content and the container has already decided how much
   * space that deserves — a text board's page, where an imported screenshot
   * capped at 160px in a 70vh pane would be a stamp floating in an empty
   * frame, and the zoom would stop being a convenience and become the only
   * way to read the page at all.
   */
  variant?: 'thumb' | 'fill';
}

/**
 * An image that stays out of the way until it is asked for.
 *
 * ## The problem
 *
 * A task sheet drew its attachment as a 224px-tall `object-cover` band. Two
 * things were wrong with that, and they pull in opposite directions:
 *
 *   - **`object-cover` crops.** A portrait photograph or a tall screenshot —
 *     which is what most task attachments are — lost its top and bottom to fill
 *     a landscape box, so the one thing the picture was attached to say could
 *     be the part that was not shown.
 *   - **It was the full-resolution file.** Up to 1600px on the long edge and a
 *     few hundred kilobytes, downloaded in full to paint a strip a fifth that
 *     size, every time the sheet was opened, whether or not anybody looked at
 *     it.
 *
 * ## What happens instead
 *
 * Inline, the small rendition is drawn `object-contain` inside a fixed box: the
 * whole picture, letterboxed, at a size and a weight that suit a thumbnail. The
 * full-size file is not requested at all — `src` is only handed to an `<img>`
 * once the viewer is open, and it is warmed on hover, so by the time a click
 * lands the bytes are usually already in the cache.
 *
 * Opened, it takes the screen: the real picture at its real resolution, with
 * the thumbnail scaled up underneath it so there is something to look at while
 * the full one decodes rather than a black rectangle. It can be zoomed with the
 * buttons, the wheel or `+`/`-`, panned by dragging once it is bigger than the
 * viewport, and closed with the return arrow, Escape, or a click on the
 * backdrop.
 *
 * Zoom and pan are one `transform` on one element, so none of it costs a layout
 * pass no matter how large the image is.
 */
export const ZoomableImage = ({
  src,
  thumbSrc,
  alt,
  className,
  variant = 'thumb',
}: ZoomableImageProps) => {
  const reduceMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isFullLoaded, setIsFullLoaded] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  // Set once, on the first hover or open, and never unset: the browser cache
  // does the rest, and re-requesting on every hover would defeat the point.
  const warmedRef = useRef(false);
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);

  const warm = useCallback(() => {
    if (warmedRef.current) return;
    warmedRef.current = true;

    const probe = new Image();
    probe.src = src;
  }, [src]);

  const reset = useCallback(() => {
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    reset();
  }, [reset]);

  const open = useCallback(() => {
    warm();
    reset();
    setIsOpen(true);
  }, [reset, warm]);

  /** Zooming back to 1 has to recentre, or the picture is parked off-screen. */
  const zoomBy = useCallback((delta: number) => {
    setZoom((current) => {
      const next = clamp(current + delta, MIN_ZOOM, MAX_ZOOM);
      if (next === MIN_ZOOM) setOffset({ x: 0, y: 0 });
      return next;
    });
  }, []);

  /*
   * Escape leaves, +/- zoom, 0 resets.
   *
   * Registered in the capture phase, which matters: the task sheet this opens
   * from is itself a dialog listening for Escape, and without capturing here
   * one press would close the sheet *behind* the viewer and leave the viewer
   * floating over a page it no longer belongs to.
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
        return;
      }
      if (event.key === '+' || event.key === '=') zoomBy(ZOOM_STEP);
      if (event.key === '-' || event.key === '_') zoomBy(-ZOOM_STEP);
      if (event.key === '0') reset();
    };

    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [close, isOpen, reset, zoomBy]);

  // A full-screen viewer over a page that is still scrolling is how you lose
  // your place in the sheet behind it.
  useEffect(() => {
    if (!isOpen) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    // Deliberately no `preventDefault`: React's wheel listener is passive, and
    // the page behind cannot scroll while the viewer is open anyway.
    zoomBy(event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLImageElement>) => {
    if (zoom <= MIN_ZOOM) return;

    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    setIsPanning(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLImageElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.x;
    const deltaY = event.clientY - drag.y;
    dragRef.current = { ...drag, x: event.clientX, y: event.clientY };

    setOffset((current) => ({ x: current.x + deltaX, y: current.y + deltaY }));
  };

  const endDrag = (event: ReactPointerEvent<HTMLImageElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setIsPanning(false);
  };

  const inlineSrc = thumbSrc ?? src;

  return (
    <>
      <button
        type="button"
        onClick={open}
        onPointerEnter={warm}
        onFocus={warm}
        title={translate('image.expand')}
        aria-label={translate('image.expand')}
        className={cn(
          'group/image relative block w-full overflow-hidden rounded-xl border border-edge bg-surface-sunken',
          'transition-colors duration-150 hover:border-brand/50',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
          variant === 'fill' && 'h-full',
          className,
        )}
      >
        {/* `object-contain`, not `-cover`: the whole picture, letterboxed. A
            crop on a thumbnail is a crop on the only version most people see. */}
        <img
          src={inlineSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={cn(
            'mx-auto w-full object-contain',
            variant === 'fill' ? 'h-full' : 'max-h-40',
          )}
        />

        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full',
            'bg-black/55 text-white opacity-0 transition-opacity duration-150',
            'group-hover/image:opacity-100',
          )}
        >
          <Expand className="h-3.5 w-3.5" />
        </span>
      </button>

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="fixed inset-0 z-[95] flex flex-col bg-black/[0.92]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.16 }}
              role="dialog"
              aria-modal="true"
              aria-label={alt}
            >
              <header className="safe-t flex items-center gap-2 px-3 py-2.5 sm:px-4">
                {/* The way back, first thing under the pointer: it sits where a
                    browser's own back control would. */}
                <button
                  type="button"
                  onClick={close}
                  aria-label={translate('image.collapse')}
                  className="inline-flex h-9 items-center gap-2 rounded-xl bg-white/10 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/20"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">{translate('image.collapse')}</span>
                </button>

                <span className="ml-auto flex items-center gap-1 rounded-xl bg-white/10 p-1">
                  <button
                    type="button"
                    onClick={() => zoomBy(-ZOOM_STEP)}
                    disabled={zoom <= MIN_ZOOM}
                    aria-label={translate('image.zoomOut')}
                    className="grid h-7 w-7 place-items-center rounded-lg text-white transition-colors hover:bg-white/20 disabled:opacity-40"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>

                  <span className="min-w-[3.25rem] text-center text-2xs font-semibold tabular-nums text-white">
                    {Math.round(zoom * 100)}%
                  </span>

                  <button
                    type="button"
                    onClick={() => zoomBy(ZOOM_STEP)}
                    disabled={zoom >= MAX_ZOOM}
                    aria-label={translate('image.zoomIn')}
                    className="grid h-7 w-7 place-items-center rounded-lg text-white transition-colors hover:bg-white/20 disabled:opacity-40"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={reset}
                    disabled={zoom === MIN_ZOOM && offset.x === 0 && offset.y === 0}
                    aria-label={translate('image.resetZoom')}
                    className="grid h-7 w-7 place-items-center rounded-lg text-white transition-colors hover:bg-white/20 disabled:opacity-40"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </span>
              </header>

              {/* Clicking the surround leaves, the way a lightbox always has —
                  but only the surround: a click that lands on the picture is
                  somebody looking at it, not somebody trying to get out. */}
              <div
                className="safe-b relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3 sm:p-6"
                onWheel={handleWheel}
                onClick={(event) => {
                  if (event.target === event.currentTarget) close();
                }}
              >
                {/*
                  The thumbnail, scaled up, until the real one has decoded.
                  Blurred on purpose: it reads as "this is not the picture yet"
                  rather than as a bad picture, and it goes the instant the
                  full-size image below reports itself loaded.
                */}
                {thumbSrc && !isFullLoaded && (
                  <img
                    aria-hidden
                    src={thumbSrc}
                    alt=""
                    className="absolute max-h-full max-w-full object-contain blur-md"
                  />
                )}

                <img
                  src={src}
                  alt={alt}
                  onLoad={() => setIsFullLoaded(true)}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onClick={() => zoom === MIN_ZOOM && zoomBy(ZOOM_STEP * 2)}
                  draggable={false}
                  className={cn(
                    'relative max-h-full max-w-full select-none object-contain will-change-transform',
                    // No transition while a drag is in flight: easing every
                    // pointer sample turns panning into swimming.
                    !reduceMotion && !isPanning && 'transition-transform duration-150',
                    zoom > MIN_ZOOM ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in',
                    !isFullLoaded && 'opacity-0',
                  )}
                  style={{
                    transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})`,
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
};
