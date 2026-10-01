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
   * How much room the inline rendition is entitled to. `thumb` (the default) caps it at 160px:
   * right where a picture is *part* of something else — a task sheet, a card.
   */
  variant?: 'thumb' | 'fill';
}

/**
 * An image that stays out of the way until it is asked for. A task sheet drew its attachment as a
 * 224px-tall `object-cover` band.
 */
export const ZoomableImage = ({
  src,
  thumbSrc,
  alt,
  className,
  variant = 'thumb',
}: ZoomableImageProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Set once, on the first hover or open, and never unset: the browser cache
  // does the rest, and re-requesting on every hover would defeat the point.
  const warmedRef = useRef(false);

  const warm = useCallback(() => {
    if (warmedRef.current) return;
    warmedRef.current = true;

    const probe = new Image();
    probe.src = src;
  }, [src]);

  const inlineSrc = thumbSrc ?? src;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          warm();
          setIsOpen(true);
        }}
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

      <ImageViewer
        src={src}
        thumbSrc={thumbSrc}
        alt={alt}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
};

interface ImageViewerProps {
  /** Full-resolution source. Only requested while the viewer is open. */
  src: string;
  /** Drawn blurred underneath until `src` has decoded. */
  thumbSrc?: string | null;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
  /**
   * Extra controls for the header, beside the zoom group — a download button, on a folder of
   * pictures.
   */
  actions?: React.ReactNode;
}

/** The full-screen half of `ZoomableImage`, on its own. */
export const ImageViewer = ({
  src,
  thumbSrc,
  alt,
  isOpen,
  onClose,
  actions,
}: ImageViewerProps) => {
  const reduceMotion = useReducedMotion();
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isFullLoaded, setIsFullLoaded] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);

  const reset = useCallback(() => {
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
  }, []);

  // Every opening starts framed, whatever the last one was zoomed to.
  useEffect(() => {
    if (isOpen) reset();
  }, [isOpen, reset]);

  // A different picture has not been decoded yet, whatever the last one was.
  useEffect(() => setIsFullLoaded(false), [src]);

  const close = useCallback(() => {
    onClose();
    reset();
  }, [onClose, reset]);

  /** Zooming back to 1 has to recentre, or the picture is parked off-screen. */
  const zoomBy = useCallback((delta: number) => {
    setZoom((current) => {
      const next = clamp(current + delta, MIN_ZOOM, MAX_ZOOM);
      if (next === MIN_ZOOM) setOffset({ x: 0, y: 0 });
      return next;
    });
  }, []);

  // Escape leaves, +/- zoom, 0 resets. Registered in the capture phase, which matters: the task
  // sheet this opens from is itself a dialog listening for Escape.
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

  return (
    <>
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

                {actions && <span className="ml-auto flex items-center gap-1.5">{actions}</span>}

                <span
                  className={cn(
                    'flex items-center gap-1 rounded-xl bg-white/10 p-1',
                    !actions && 'ml-auto',
                  )}
                >
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

              {/* Clicking the surround leaves, the way a lightbox always has — but only the
                  surround. */}
              <div
                className="safe-b relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3 sm:p-6"
                onWheel={handleWheel}
                onClick={(event) => {
                  if (event.target === event.currentTarget) close();
                }}
              >
                {/* The thumbnail, scaled up, until the real one has decoded. */}
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
