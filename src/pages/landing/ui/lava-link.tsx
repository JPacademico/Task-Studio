import { Link, type LinkProps } from 'react-router-dom';

import { cn } from '@/shared/lib/cn';
import { LavaSurface, buttonClasses } from '@/shared/ui';

interface LavaLinkProps extends LinkProps {
  size?: 'sm' | 'md' | 'lg';
}

/**
 * A call to action that navigates, with the lamp inside it.
 *
 * ## Why this exists rather than `buttonClasses({ variant: 'lava' })`
 *
 * Because the lamp is seven elements now, not two pseudo-elements, and a class
 * cannot put children inside an anchor. The class still carries everything that
 * *is* expressible in CSS — the tube colour, the edge, the label colour and the
 * hover fill — so `variant: 'lava'` on its own is a coherent, still control;
 * this is the same thing with the wax actually moving in it.
 *
 * ## Why it stays an anchor
 *
 * The same reason `buttonClasses` is exported at all: these navigate, and
 * rendering a navigation as `<button onClick={navigate}>` throws away
 * middle-click, open-in-new-tab, the destination on hover and anything a
 * crawler can follow. Those are exactly the affordances a page aimed at people
 * who have not signed up yet should not be discarding.
 *
 * ## Why it lives here and not in `shared/ui`
 *
 * Nothing in `shared/` imports the router, and this would be the first thing to
 * — for three call sites that are all on this page. `LavaSurface` is the part
 * worth sharing and it is shared; the router binding is local.
 */
export const LavaLink = ({ size = 'md', className, children, ...props }: LavaLinkProps) => (
  <Link className={buttonClasses({ variant: 'lava', size, className })} {...props}>
    <LavaSurface />

    {/*
      The label needs its own box, and `relative` on it is what puts it above
      the lamp: the surface and the hover fill both sit at `z-index: -1` inside
      the anchor's own stacking context, which paints them over its background
      and under its in-flow content. An unpositioned text node would still land
      on top, but an icon beside it would not reliably.
    */}
    <span className={cn('relative inline-flex items-center justify-center', GAPS[size])}>
      {children}
    </span>
  </Link>
);

/** Matching `Button`: the gap belongs to the label row, not to the control. */
const GAPS: Record<NonNullable<LavaLinkProps['size']>, string> = {
  sm: 'gap-1.5',
  md: 'gap-2',
  lg: 'gap-2.5',
};
