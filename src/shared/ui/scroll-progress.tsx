import { useEffect, useRef, useState } from 'react';

import { cn } from '@/shared/lib/cn';

/**
 * How much of the page is behind you, drawn as a hairline under the header. The landing page is
 * eleven sections and the documentation is forty-odd, and both are a single uninterrupted column.
 */
export const ScrollProgress = ({ className }: { className?: string }) => {
  const fill = useRef<HTMLDivElement>(null);

  // Whether there is anything to track. A page that fits on screen has no progress to report, and a
  // permanently empty track under the header is a control that looks broken.
  const [isScrollable, setIsScrollable] = useState(false);

  useEffect(() => {
    const draw = () => {
      const { scrollHeight, clientHeight } = document.documentElement;
      const travel = scrollHeight - clientHeight;

      // A page has to overflow by a tenth of a screen before it gets a bar.
      const scrollable = travel > clientHeight * 0.1;
      setIsScrollable(scrollable);
      if (!scrollable || !fill.current) return;

      const progress = Math.min(1, Math.max(0, window.scrollY / travel));
      fill.current.style.transform = `scaleX(${progress})`;
    };

    draw();

    // `passive`, because this handler never calls `preventDefault` and telling the browser so is
    // what keeps it off the critical path of the scroll itself.
    window.addEventListener('scroll', draw, { passive: true });
    const observer = new ResizeObserver(draw);
    observer.observe(document.documentElement);

    return () => {
      window.removeEventListener('scroll', draw);
      observer.disconnect();
    };
    // `isScrollable` is written here and read only in the render below, so it is deliberately not a
    // dependency.
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
          // Three stops rather than a flat fill.
          'bg-[linear-gradient(90deg,rgb(var(--brand)/0.25),rgb(var(--brand)/0.75)_45%,rgb(var(--brand)))]',
          // The leading edge, lit. A shadow rather than a second element: it
          // costs nothing to composite and it inherits the skin's accent.
          'shadow-[0_0_10px_-1px_rgb(var(--brand)/0.7)]',
        )}
      />
    </div>
  );
};
