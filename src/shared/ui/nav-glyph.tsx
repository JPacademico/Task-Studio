import type { LucideIcon } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import type { NavGlyphKey } from './glyph-kit';

interface NavGlyphProps {
  /** Which destination this is — the same key a pinned shortcut stores. */
  glyph: NavGlyphKey;
  /** The icon. Every skin draws this one now; see the note below. */
  fallback: LucideIcon;
  className?: string;
}

/**
 * A menu entry's icon. Eight skins used to bring a complete replacement set of navigation icons,
 * and all eight have been withdrawn.
 */
export const NavGlyph = ({ fallback: Icon, className }: NavGlyphProps) => (
  /* The wrapper exists for the effects, and is inert without them. `inline-flex` and nothing else
     by default — no padding, no size of its own. */
  <span aria-hidden className="nav-glyph">
    <Icon className={cn(className)} />
  </span>
);
