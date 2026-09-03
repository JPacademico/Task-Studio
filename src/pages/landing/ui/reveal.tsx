import { useRef, type ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';

import { cn } from '@/shared/lib/cn';
import { useRevealOnScroll } from '@/shared/lib/use-reveal-on-scroll';

/**
 * A section arriving as the reader reaches it.
 *
 * ## Why this is not `whileInView`
 *
 * Framer has a prop for exactly this and it is the wrong tool for a *section*.
 * `whileInView` pairs an `initial` of `opacity: 0` with a transition that only
 * ever runs from an `IntersectionObserver` callback — so when that callback
 * never arrives, the element stays at zero. Permanently. Markup present,
 * correct, and invisible.
 *
 * That is not hypothetical: the observer does not fire in a heavily throttled
 * background tab, in several automation and preview contexts, and behind a
 * handful of privacy extensions that stub it out. On a marketing page whose
 * entire job is to be read, "the section is blank" is a far worse outcome than
 * "the animation was missed". So the trigger is `useRevealOnScroll`, which
 * answers the same question and has a timer under it: the observer decides on
 * every browser where scroll triggering works, and the content appears anyway
 * where it does not.
 *
 * ## Why the movement is CSS and not Framer either
 *
 * Because the trigger firing is only half of the guarantee. A Framer animation
 * needs its own loop to run — and that loop is driven by `requestAnimationFrame`
 * — so in an environment where rAF is paused or starved, the element is *told*
 * to reveal and still sits at `initial`. The failure mode is identical to the
 * one above and arrives by a different road.
 *
 * A CSS transition cannot fail that way. The revealed state is a class, so the
 * element's computed style becomes the final style the moment React commits;
 * the transition is only how it gets there. Starve the compositor and the
 * content snaps in rather than never arriving. For decoration Framer is the
 * better tool and it is what the rest of this page uses; for the wrapper that
 * decides whether a section is *legible*, the one that degrades to "visible" is
 * the correct one.
 *
 * ## Why the whole section and not each element
 *
 * Staggering every heading, paragraph and card into place is the pattern that
 * makes a page feel like it is loading rather than arriving — and on a page
 * where several sections already animate *internally* (the demos, the belt, the
 * notes wall) a second layer of entrance choreography on top of them reads as
 * jitter. One quiet lift per section is enough to acknowledge the scroll and
 * little enough to stay out of the way of the things that move on purpose.
 *
 * ## Why the movement is this small
 *
 * 16px over half a second. A section that slides half a screen is a section the
 * reader watches instead of reads, and it fights the scroll they are already
 * performing — they are moving the page down while the content moves up. Enough
 * to register, not enough to argue with.
 */
export const Reveal = ({
  children,
  className,
  /** Staggers siblings inside one section. Milliseconds. */
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) => {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const isRevealed = useRevealOnScroll(ref);

  /*
   * Nothing to reveal *from* when motion is off.
   *
   * Not a faster fade — no starting state at all, so the section is simply
   * there. An entrance is unrequested motion by definition, and the preference
   * exists to say so.
   */
  const isVisible = reduceMotion || isRevealed;

  return (
    <div
      ref={ref}
      className={cn(
        'motion-safe:transition-[opacity,transform] motion-safe:duration-500 motion-safe:ease-studio',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
        className,
      )}
      // Applied unconditionally: the delay is what staggers the reveal, so it
      // has to be on the element before the class flips, not after.
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
};
