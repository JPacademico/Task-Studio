/** The `t`, as the design team drew it. */

export interface StudioLetterProps {
  /** Places the 24×24 glyph box inside the caller's own viewBox. */
  transform?: string;
  /** Defaults to the page colour, which is what every drawn skin writes in. */
  stroke?: string;
  /**
   * In glyph-box units, so a caller scaling by 0.85 gets 0.85 of this. `3.6` is deliberately
   * heavier than the reference art.
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
 * Where the letter sits on a note drawn at the common 40×40 size. Seven of the marks share one
 * sheet — x 6→33, y 6.5→34.
 */
export const LETTER_ON_SHEET = 'translate(9.2 9.6) scale(0.85)';
