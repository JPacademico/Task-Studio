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
 * A menu entry's icon.
 *
 * ## Why every skin draws the same shape now
 *
 * Eight skins used to bring a complete replacement set of navigation icons,
 * and all eight have been withdrawn. The argument for them was that a skin
 * which only recolours its icons is a skin you stop noticing; the argument
 * against is stronger and is about the person using it rather than about the
 * skin.
 *
 * An icon is learned once and recognised by *shape* thereafter — nobody reads
 * a navigation rail, they aim at the outline they remember. A rail whose
 * shapes change with the theme charges every user that recognition again, and
 * charges it repeatedly, because switching skins is a thing people do for fun
 * in this app. Somebody who had learned where the notes board is went hunting
 * for it on newsprint. That is a real cost paid every day for a novelty that
 * lands once.
 *
 * The consistency is also what makes a pinned shortcut mean anything: the pill
 * in the header, the entry in the rail and the item in the hidden sidebar are
 * the same destination, and they only *look* like the same destination if the
 * glyph is stable.
 *
 * ## What was kept, and why it is a class rather than a component
 *
 * Three of those worlds were doing something to their icons that reads as the
 * world rather than as a different alphabet — hazard's warning-light glow,
 * eldritch's blink, underwater's slow fill — and those survive as *effects on
 * the ordinary icon*, driven entirely by `[data-skin]` rules against the
 * `.nav-glyph` class in `index.css`.
 *
 * Doing it in CSS rather than here is what keeps this component honest. There
 * is no skin lookup, no per-theme branch and no subscription to the theme
 * store: the class is unconditional, the active skin is already an attribute
 * on the document, and a skin that wants to do something to its icons adds a
 * rule without touching a React tree. It also means the effects cost nothing
 * on the ten skins that have none, and that `prefers-reduced-motion` removes
 * all three through the one global rule that already exists.
 */
export const NavGlyph = ({ fallback: Icon, className }: NavGlyphProps) => (
  /*
   * The wrapper exists for the effects, and is inert without them.
   *
   * `inline-flex` and nothing else by default — no padding, no size of its
   * own — so on the skins that draw no effect this is one extra element with
   * no visual consequence, laid out exactly where the bare icon was. The
   * underwater fill needs a positioned box to clip an overlay against, which
   * is why the effect cannot live on the SVG itself.
   */
  <span aria-hidden className="nav-glyph">
    <Icon className={cn(className)} />
  </span>
);
