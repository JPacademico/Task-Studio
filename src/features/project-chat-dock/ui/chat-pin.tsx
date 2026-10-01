import { useRef, useState } from 'react';
import { animate, motion, useMotionValue, useReducedMotion } from 'framer-motion';

import { cn } from '@/shared/lib/cn';
import { useT } from '@/shared/i18n';

interface ChatPinProps {
  isPinned: boolean;
  onPinnedChange: (isPinned: boolean) => void;
  /** The window the pin can be pushed into. */
  targetRef: React.RefObject<HTMLElement | null>;
  /** Lets the window light up while the pin is being carried over it. */
  onHoverTargetChange?: (isOver: boolean) => void;
}

/** How the pin travels back to its anchor once it is let go. */
const HOME_SPRING = { type: 'spring', stiffness: 240, damping: 22, mass: 0.6 } as const;

/**
 * A thumbtack, drawn rather than borrowed. The head catches a highlight and the needle has a real
 * point, because this is an object the user picks up and pushes into something.
 */
const Tack = ({ isPinned }: { isPinned: boolean }) => (
  <svg viewBox="0 0 32 32" fill="none" aria-hidden className="h-full w-full">
    <defs>
      <radialGradient id="chat-pin-head" cx="34%" cy="28%" r="72%">
        <stop offset="0%" stopColor="rgb(255 255 255 / 0.95)" />
        <stop offset="45%" stopColor="rgb(var(--brand))" />
        <stop offset="100%" stopColor="rgb(var(--brand) / 0.72)" />
      </radialGradient>
    </defs>

    {/* Needle. Shortens as it goes in, so the tack looks driven home. */}
    <motion.path
      d="M16 19 L16 30"
      stroke="rgb(var(--content) / 0.55)"
      strokeWidth="2"
      strokeLinecap="round"
      initial={false}
      animate={{ pathLength: isPinned ? 0.45 : 1, opacity: isPinned ? 0.9 : 0.6 }}
      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
    />

    {/* Collar. */}
    <rect x="11" y="15.5" width="10" height="4.5" rx="1.6" fill="rgb(var(--brand) / 0.85)" />

    {/* Head. */}
    <circle cx="16" cy="10.5" r="8" fill="url(#chat-pin-head)" />
    <circle cx="16" cy="10.5" r="8" fill="none" stroke="rgb(var(--brand-contrast) / 0.35)" strokeWidth="1" />
    <ellipse cx="12.8" cy="7.2" rx="2.6" ry="1.8" fill="rgb(255 255 255 / 0.75)" transform="rotate(-28 12.8 7.2)" />
  </svg>
);

/**
 * The pin that keeps the project chat on screen. It floats above the middle of the window's top
 * edge, bobbing.
 */
export const ChatPin = ({
  isPinned,
  onPinnedChange,
  targetRef,
  onHoverTargetChange,
}: ChatPinProps) => {
  const t = useT();
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const selfRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  // Whether the gesture in progress turned into a drag. A drag *usually* ends in a click event too,
  // and that click must not undo the decision the drop just made.
  const didDragRef = useRef(false);

  /** Is the pin's own point currently over the chat window? */
  const isOverTarget = (): boolean => {
    const target = targetRef.current?.getBoundingClientRect();
    const self = selfRef.current?.getBoundingClientRect();
    if (!target || !self) return false;

    // The needle's tip, not the head — you aim a tack with its point.
    const tipX = self.left + self.width / 2;
    const tipY = self.bottom;

    return (
      tipX >= target.left && tipX <= target.right && tipY >= target.top && tipY <= target.bottom
    );
  };

  const isBobbing = !isPinned && !isDragging && !reduceMotion;

  return (
    <motion.div
      ref={selfRef}
      drag
      // No constraints and no momentum: the pin goes wherever the pointer takes it and stops there,
      // then springs home on release.
      dragMomentum={false}
      style={{ x, y }}
      // The start of every gesture, drag or click. See `didDragRef`.
      onPointerDown={() => {
        didDragRef.current = false;
      }}
      onDragStart={() => {
        setIsDragging(true);
        didDragRef.current = true;
        onHoverTargetChange?.(false);
      }}
      onDrag={() => onHoverTargetChange?.(isOverTarget())}
      onDragEnd={() => {
        const landed = isOverTarget();
        setIsDragging(false);
        onHoverTargetChange?.(false);

        // Either way the pin returns to its own anchor — pinned or loose, its home is the top of
        // the window, not wherever the pointer stopped.
        if (reduceMotion) {
          x.set(0);
          y.set(0);
        } else {
          animate(x, 0, HOME_SPRING);
          animate(y, 0, HOME_SPRING);
        }

        if (landed !== isPinned) onPinnedChange(landed);
      }}
      onClick={() => {
        // Set by `onDragStart`, cleared by the next `onPointerDown` — never
        // here, which is what used to leave it latched. See `didDragRef`.
        if (didDragRef.current) return;
        // Clicking a tack that is in pulls it out. Clicking one that is loose pushes it in — the
        // same result as dragging it over, for anyone who would rather not drag at all.
        onPinnedChange(!isPinned);
      }}
      title={t(isPinned ? 'chat.pinnedHint' : 'chat.dragToPin')}
      aria-label={t(isPinned ? 'chat.unpinAria' : 'chat.pinAria')}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onPinnedChange(!isPinned);
      }}
      className={cn(
        'absolute z-10 h-11 w-11 cursor-grab touch-none select-none active:cursor-grabbing',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
        'focus-visible:ring-offset-surface',
        // Centred on the window's top edge. `w-11` is 2.75rem, so pulling it back by half of that
        // is what puts the needle on the middle.
        'left-1/2 -ml-[1.375rem]',
        // Loose, it hovers clear of the window — far enough that its point is outside the drop
        // target, or resting would already read as a hit.
        isPinned ? '-top-3' : '-top-[3.25rem]',
        // The travel between those two spots is the animation that sells it.
        'transition-[top] duration-300 ease-studio',
      )}
    >
      <span className={cn('block h-full w-full', isBobbing && 'chat-pin-bob')}>
        <span
          className="relative block h-full w-full transition-transform duration-200 ease-studio"
          style={{
            transform: isDragging
              ? 'rotate(-8deg) scale(1.14)'
              : isPinned
                ? 'none'
                : 'rotate(-12deg)',
          }}
        >
          {/* The halo. Only while the pin is loose — once it is in, the job is
              done and a pulsing glow would just be noise. */}
          {!isPinned && (
            <span
              aria-hidden
              className={cn(
                'absolute inset-1 rounded-full bg-brand/25 blur-md',
                !reduceMotion && 'chat-pin-halo',
              )}
            />
          )}

          <span className="relative block h-full w-full drop-shadow-[0_4px_8px_rgb(0_0_0/0.4)]">
            <Tack isPinned={isPinned} />
          </span>
        </span>
      </span>
    </motion.div>
  );
};
