import { motion, useReducedMotion } from 'framer-motion';

import { useSkin } from '@/app/providers/theme-provider';
import { cn } from '@/shared/lib/cn';
import type { NavEdge } from '@/shared/lib/nav-preferences.store';
import { PushPin } from './studio-icons';

interface EdgeAffordanceProps {
  edge: NavEdge;
  /** Hidden while the menu it belongs to is showing. */
  isHidden: boolean;
  label: string;
}

/** The strip that hugs the edge itself. */
const RAIL: Record<NavEdge, string> = {
  left: 'left-0 top-1/2 h-40 w-[10px] rounded-r-full',
  right: 'right-0 top-1/2 h-40 w-[10px] rounded-l-full',
  top: 'top-0 left-1/2 h-[10px] w-40 rounded-b-full',
};

/**
 * The bulge that swells out of the rail. Sized generously and blurred: this is
 * the part that has to be noticed from the far side of the screen.
 */
const SWELL: Record<NavEdge, string> = {
  left: 'left-0 top-1/2 h-52 w-16 rounded-r-[100%] origin-left',
  right: 'right-0 top-1/2 h-52 w-16 rounded-l-[100%] origin-right',
  top: 'top-0 left-1/2 h-16 w-52 rounded-b-[100%] origin-top',
};

/**
 * The half-size shift that centres both layers on their edge.
 *
 * It has to be a motion value rather than a Tailwind `-translate-y-1/2` class:
 * Framer Motion writes the whole `transform` property, so the moment the swell
 * animates its scale the utility class is overwritten and the bulge slides off
 * centre — which is exactly why the thin rail looked right and the wave did not.
 */
const CENTRE: Record<NavEdge, { x?: string; y?: string }> = {
  left: { y: '-50%' },
  right: { y: '-50%' },
  top: { x: '-50%' },
};

const GRADIENT: Record<NavEdge, string> = {
  left: 'bg-[radial-gradient(120%_65%_at_0%_50%,rgb(var(--brand)/0.55),rgb(var(--brand)/0.16)_55%,transparent_78%)]',
  right:
    'bg-[radial-gradient(120%_65%_at_100%_50%,rgb(var(--brand)/0.55),rgb(var(--brand)/0.16)_55%,transparent_78%)]',
  top: 'bg-[radial-gradient(65%_120%_at_50%_0%,rgb(var(--brand)/0.55),rgb(var(--brand)/0.16)_55%,transparent_78%)]',
};

/**
 * The same bulge, in the deep field's material: a singularity sunk into the
 * edge, with its accretion light around it.
 *
 * Deliberately only a different gradient. The first version of this was its own
 * object — a four-layer disc with a turning accretion ring, sized and animated
 * by its own rules — and however good it looked in isolation, it was a second
 * thing on screen where every other skin had one. It read as heavier and larger
 * than the plain swell no matter what it was scaled to, because an opaque disc
 * next to a soft glow always will.
 *
 * So the shape, the size, the blur, the pulse and the lit rail are now shared
 * with every other skin, and the only thing the deep field brings is what the
 * bulge is made of: black at the edge itself, then the accretion colours — mint
 * closest in where the disc is hottest, violet further out — falling to nothing.
 * It works on both palettes without an override, because a black hole is the
 * one object that is defined by the light around it rather than by its own
 * value: on the void it is a halo, on a lit page it is a well.
 */
const VOID_GRADIENT: Record<NavEdge, string> = {
  left: 'bg-[radial-gradient(120%_65%_at_0%_50%,rgb(0_0_0/0.92)_0_24%,rgb(var(--brand)/0.7)_38%,rgb(var(--space-flare)/0.38)_56%,transparent_80%)]',
  right:
    'bg-[radial-gradient(120%_65%_at_100%_50%,rgb(0_0_0/0.92)_0_24%,rgb(var(--brand)/0.7)_38%,rgb(var(--space-flare)/0.38)_56%,transparent_80%)]',
  top: 'bg-[radial-gradient(65%_120%_at_50%_0%,rgb(0_0_0/0.92)_0_24%,rgb(var(--brand)/0.7)_38%,rgb(var(--space-flare)/0.38)_56%,transparent_80%)]',
};

/** The lit strip at the edge. In orbit it is the photon ring, so it runs cyan. */
const RAIL_TONE = {
  default: 'bg-gradient-to-b from-brand/0 via-brand to-brand/0 shadow-[0_0_18px_rgb(var(--brand)/0.75)]',
  space:
    'bg-gradient-to-b from-brand/0 via-[rgb(var(--space-plasma))] to-brand/0 shadow-[0_0_18px_rgb(var(--brand)/0.85)]',
};

/** Which axis the bulge grows along. */
const SWELL_KEYFRAMES: Record<NavEdge, Record<string, number[]>> = {
  left: { scaleX: [0.55, 1, 0.55], scaleY: [0.9, 1, 0.9] },
  right: { scaleX: [0.55, 1, 0.55], scaleY: [0.9, 1, 0.9] },
  top: { scaleY: [0.55, 1, 0.55], scaleX: [0.9, 1, 0.9] },
};

/**
 * The hint that a menu lives just off-screen.
 *
 * A hidden-by-default chrome is only usable if something tells you it is there.
 * The previous version was a 7px sliver with a chevron fading in and out, which
 * asked the user to notice a 12px glyph in their peripheral vision. This one
 * takes real space instead: the rail breathes, and a soft protuberance swells
 * out of the edge like a wave pushing against it — the same signal, at a size
 * that registers without being read.
 *
 * Every skin draws the identical pair of layers at the identical size. A skin
 * only chooses what the bulge is made of — the deep field sinks a singularity
 * into the edge instead of a glow, and that is the whole of the difference.
 */
export const EdgeAffordance = ({ edge, isHidden, label }: EdgeAffordanceProps) => {
  const reduceMotion = useReducedMotion();
  const isSpace = useSkin() === 'SPACE';

  // Nothing to invite the user towards while the menu is already on screen, so
  // the loops stop rather than running forever behind `opacity: 0` — three
  // rails were otherwise holding six infinite animations open at all times,
  // including for a menu the user had pinned permanently open.
  const isAnimating = isHidden && !reduceMotion;

  return (
    <div
      aria-hidden
      title={label}
      className={cn(
        'pointer-events-none fixed inset-0 z-30 transition-opacity duration-300',
        isHidden ? 'opacity-100' : 'opacity-0',
      )}
    >
      {/* The wave. Transform + opacity only, so it never leaves the compositor. */}
      <motion.span
        className={cn(
          'fixed blur-[6px]',
          SWELL[edge],
          isSpace ? VOID_GRADIENT[edge] : GRADIENT[edge],
        )}
        initial={false}
        style={CENTRE[edge]}
        animate={
          isAnimating ? { ...SWELL_KEYFRAMES[edge], opacity: [0.5, 1, 0.5] } : { opacity: 0.7 }
        }
        transition={{ duration: 3, repeat: isAnimating ? Infinity : 0, ease: [0.4, 0, 0.2, 1] }}
      />

      {/* The lit edge itself, so the source of the wave is unambiguous. */}
      <motion.span
        className={cn(
          'fixed',
          isSpace ? RAIL_TONE.space : RAIL_TONE.default,
          edge === 'top' && 'bg-gradient-to-r',
          RAIL[edge],
        )}
        initial={false}
        style={CENTRE[edge]}
        animate={isAnimating ? { opacity: [0.55, 1, 0.55] } : { opacity: 0.8 }}
        transition={{ duration: 3, repeat: isAnimating ? Infinity : 0, ease: [0.4, 0, 0.2, 1] }}
      />
    </div>
  );
};

interface NavPinButtonProps {
  isPinned: boolean;
  onToggle: () => void;
  className?: string;
}

/**
 * Drives the push pin into a menu so it stops hiding itself.
 *
 * The control is the pin, nothing else. A permanent tinted tile with a ring
 * around it competed with the header it sits in for no benefit — the glyph
 * already reads as a pin — so the container only materialises under the
 * pointer, and the pin itself is untouched in either state.
 */
export const NavPinButton = ({ isPinned, onToggle, className }: NavPinButtonProps) => (
  <button
    type="button"
    onClick={onToggle}
    aria-pressed={isPinned}
    title={isPinned ? 'Unpin — let the menu hide again' : 'Pin the menu open'}
    aria-label={isPinned ? 'Unpin this menu' : 'Pin this menu open'}
    className={cn(
      'group/pin relative grid h-9 w-9 shrink-0 place-items-center rounded-xl text-brand',
      'border border-transparent bg-transparent',
      'transition-[background-color,border-color,transform] duration-150 ease-studio',
      'hover:border-brand/35 hover:bg-brand/10 active:scale-95',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
      className,
    )}
  >
    <PushPin isPinned={isPinned} className="relative h-[1.15rem] w-[1.15rem]" />
  </button>
);
