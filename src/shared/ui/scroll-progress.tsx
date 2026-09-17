import { useEffect, useRef, useState } from 'react';

import { cn } from '@/shared/lib/cn';

/**
 * How much of the page is behind you, drawn as a hairline under the header.
 *
 * ## Why a bar and not a percentage
 *
 * The landing page is eleven sections and the documentation is forty-odd, and
 * both are a single uninterrupted column. A scrollbar answers "where am I" —
 * badly, on a trackpad, where it is hidden until you move — and it answers it
 * at the far right of the screen, which is nowhere near where anybody is
 * reading. This is the same answer put where the eye already is, and it costs
 * two pixels of chrome and one listener.
 *
 * It is deliberately not a reading-time estimate or a section counter. The one
 * thing somebody wants mid-page is how much is left, and a filled proportion
 * says that without a number to read.
 *
 * ## Why it fits every skin without being written fifteen times
 *
 * The fill is `--brand` and nothing else, so it is teal on Studio, orange on
 * Halloween, phosphor green on Terminal, and so on — each skin gets a bar in
 * its own accent for free. What is layered on top is proportional rather than
 * absolute: the lit leading edge is a `box-shadow` in the same colour, so a
 * flat palette gets a flat cap and a neon one glows. The height comes from
 * `--scroll-progress-height`, which is the one thing a skin with heavier
 * chrome may want to change. Nothing in here reads a skin name.
 *
 * ## Why this is a scroll listener and not `useScroll`
 *
 * Framer's version of this is three lines shorter and it drives the value from
 * the animation frame loop, which means a spring, a subscription and the whole
 * motion runtime for a number the browser hands us directly. The listener
 * below writes one transform per scroll event on an element nothing else
 * touches — no React state, so no render — and the smoothing that the spring
 * was there to provide is a 120ms CSS transition that the compositor runs on
 * its own thread and that `prefers-reduced-motion` already switches off
 * globally (see the rule in `index.css`).
 *
 * ## Why the width is a transform
 *
 * `scaleX` is the one way to animate a width without laying the page out
 * again. This is updated on every scroll event of a document several thousand
 * pixels long; animating `width` would put a layout pass inside the scroll
 * handler, which is the classic way to make a page feel heavy exactly while
 * somebody is moving through it.
 */
export const ScrollProgress = ({ className }: { className?: string }) => {
  const fill = useRef<HTMLDivElement>(null);

  /*
   * Whether there is anything to track.
   *
   * A page that fits on screen has no progress to report, and a permanently
   * empty track under the header is a control that looks broken. Measured
   * rather than assumed, because the same header sits on a documentation page
   * whose height depends on which language it is being read in.
   */
  const [isScrollable, setIsScrollable] = useState(false);

  useEffect(() => {
    const draw = () => {
      const { scrollHeight, clientHeight } = document.documentElement;
      const travel = scrollHeight - clientHeight;

      // A page has to overflow by a tenth of a screen before it gets a bar, so
      // a document that spills over by a few pixels of rounding does not get
      // one that is full the moment it appears.
      const scrollable = travel > clientHeight * 0.1;
      setIsScrollable(scrollable);
      if (!scrollable || !fill.current) return;

      const progress = Math.min(1, Math.max(0, window.scrollY / travel));
      fill.current.style.transform = `scaleX(${progress})`;
    };

    draw();

    /*
     * `passive`, because this handler never calls `preventDefault` and telling
     * the browser so is what keeps it off the critical path of the scroll
     * itself. The observer is on `documentElement` rather than a resize
     * listener: the document grows when an image loads or a section expands,
     * neither of which resizes the window.
     */
    window.addEventListener('scroll', draw, { passive: true });
    const observer = new ResizeObserver(draw);
    observer.observe(document.documentElement);

    return () => {
      window.removeEventListener('scroll', draw);
      observer.disconnect();
    };
    // `isScrollable` is written here and read only in the render below, so it
    // is deliberately not a dependency — re-subscribing on every change would
    // tear the listener down and put it back for a boolean that is usually the
    // same one it already was.
  }, []);

  if (!isScrollable) return null;

  return (
    <div
      aria-hidden
      className={cn(
        // Sits *on* the header's bottom border rather than below it, so the
        // chrome is the same height whether or not this is showing.
        'pointer-events-none absolute inset-x-0 bottom-0 translate-y-px overflow-hidden',
        'h-[var(--scroll-progress-height,2px)]',
        className,
      )}
    >
      <div
        ref={fill}
        style={{ transform: 'scaleX(0)' }}
        className={cn(
          'h-full w-full origin-left will-change-transform',
          'transition-transform duration-[120ms] ease-linear',
          // Three stops rather than a flat fill: the tail fades back into the
          // border it is drawn over, so the bar reads as a trace left behind
          // rather than as a block that starts abruptly at the left edge.
          'bg-[linear-gradient(90deg,rgb(var(--brand)/0.25),rgb(var(--brand)/0.75)_45%,rgb(var(--brand)))]',
          // The leading edge, lit. A shadow rather than a second element: it
          // costs nothing to composite and it inherits the skin's accent.
          'shadow-[0_0_10px_-1px_rgb(var(--brand)/0.7)]',
        )}
      />
    </div>
  );
};
