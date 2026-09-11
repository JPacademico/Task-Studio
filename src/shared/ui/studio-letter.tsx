/**
 * The `t`, as the design team drew it.
 *
 * ## Why the letter is its own file
 *
 * Because thirteen skins have to draw it and eight of them live in their own
 * modules. `studio-icons.tsx` imports every one of those, so a letter exported
 * from there and imported back would be a cycle — the kind that resolves fine
 * until a bundler reorders the graph and one of the marks renders `undefined`.
 * A leaf module nothing else imports cannot do that.
 *
 * It is also the only part of the mark that is genuinely *shared*. Everything
 * else about the logo is per-skin: paper curls, slate bevels, stone breaks,
 * crust plates. The letter is the one thing that must be the same object on all
 * of them, because it is what the mark actually says.
 *
 * ## The box
 *
 * Drawn into a 24×24 box, with ink occupying roughly x 5.4–17.9 and y 2.2–21.
 * Every caller is a 40×40 mark, so placement is one `transform` that says where
 * the note is and how big the letter should be inside it — see the call sites.
 * A 24 grid rather than the marks' own 40 so the numbers here are the familiar
 * icon-grid ones and a skin can rescale without re-deriving the glyph.
 *
 * ## Why two strokes and not one filled outline
 *
 * The design is a marker stroke: even width, round ends, one continuous pull
 * for the stem and one for the bar. A filled path would have to fake that with
 * an outline four times the point count, and would lose the one property that
 * matters at 16px — that `strokeWidth` is a number a caller can raise when the
 * mark is rendered small, which is exactly what the favicon does.
 */

export interface StudioLetterProps {
  /** Places the 24×24 glyph box inside the caller's own viewBox. */
  transform?: string;
  /** Defaults to the page colour, which is what every drawn skin writes in. */
  stroke?: string;
  /**
   * In glyph-box units, so a caller scaling by 0.85 gets 0.85 of this.
   *
   * `3.6` is deliberately heavier than the reference art, which was drawn for
   * display sizes and sets the stem at about 2.8 of this box. The mark renders
   * between 20px and 36px in the product and 16px in a browser tab; at strict
   * proportion the stem lands near one device pixel and the letter greys out
   * into the paper. Thickening the one stroke is the whole of the small-size
   * optimisation, and at 36px it still reads as the same marker.
   */
  strokeWidth?: number;
  strokeOpacity?: number;
  /** Used by the skins whose ink pulses — see `RunicMark` and its siblings. */
  className?: string;
}

/** The stem: one pull down, flicking right at the foot. */
const STEM = 'M12 2.2C11.4 8 11.5 14.5 12.3 18.2c.5 2.7 3.3 3.6 5.5 1.8';

/** The bar: drawn left to right and rising slightly, the way a hand writes it. */
const BAR = 'M5.4 11.3c3.2-.7 8.6-1.4 12.5-1.8';

export const StudioLetter = ({
  transform,
  stroke = 'rgb(var(--surface-raised))',
  strokeWidth = 3.6,
  strokeOpacity,
  className,
}: StudioLetterProps) => (
  <g
    transform={transform}
    fill="none"
    stroke={stroke}
    strokeWidth={strokeWidth}
    strokeOpacity={strokeOpacity}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d={STEM} />
    <path d={BAR} />
  </g>
);

/**
 * Where the letter sits on a note drawn at the common 40×40 size.
 *
 * Seven of the marks share one sheet — x 6→33, y 6.5→34 — so they share one
 * placement rather than each repeating the arithmetic and drifting apart by a
 * tenth of a unit. The scale puts the letter at a little over half the sheet's
 * height, which is where the reference art has it.
 */
export const LETTER_ON_SHEET = 'translate(9.2 9.6) scale(0.85)';
