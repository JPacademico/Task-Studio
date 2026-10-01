import { Link, type LinkProps } from 'react-router-dom';

import { cn } from '@/shared/lib/cn';
import { LavaSurface, buttonClasses } from '@/shared/ui';

interface LavaLinkProps extends LinkProps {
  size?: 'sm' | 'md' | 'lg';
}

/** A call to action that navigates, with the lamp inside it. */
export const LavaLink = ({ size = 'md', className, children, ...props }: LavaLinkProps) => (
  <Link className={buttonClasses({ variant: 'lava', size, className })} {...props}>
    <LavaSurface />

    {/* The label needs its own box, and `relative` on it is what puts it above the lamp. */}
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
