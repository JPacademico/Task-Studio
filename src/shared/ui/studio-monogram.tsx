/**
 * The design team's mark, in the 40-unit box every skin draws its mark in: a square sheet whose
 * bottom-right corner curls under, the edge of a second sheet behind it, and `TS`.
 */

/** The sheet. The corner curls under in two lobes, the second sweeping out along the bottom edge. */
export const MARK_SHEET =
  'M4 4H34V23C34 25.4 32.75 27.85 30.5 28.76C29.58 29.16 28.6 29.15 27.5 29.15' +
  'C26.6 30.6 25.4 31.6 23.6 32.4C21.2 33.5 18.2 34 14.4 34H4Z';

/** The second sheet, offset down and right, showing only along its right and bottom edges. */
export const MARK_BRACKET = 'M35 6H36V36H6V35H35Z';

/**
 * The T, with a ring round the S cut out of it where the two overlap. The art's ring is 0.3 units;
 * this one is 0.6 so the S still separates at the 32px nav size.
 */
const T_GLYPH =
  'M8.35 11.7H18.73Q17.07 12.33 16.21 13.57Q15.54 14.56 15.5 15.81Q15.48 16.97 15.7 17.66' +
  'Q16.13 18.99 17.4 19.83V20.76H16.04Q15.51 20.76 15.44 21.29Q15.37 21.92 15.51 22.54' +
  'Q15.91 24.33 17.4 25.43V26H12.45V16.2H8.35Z';

/** The S, drawn whole over the T. Flat terminal cuts, ball ends in both counters. */
const S_GLYPH =
  'M16.04 21.36H21.65C21.87 21.56 21.83 22.47 22.66 22.55C23.5 22.63 24.37 21.88 23.51 21.18' +
  'C22.82 20.63 21.73 20.61 20.9 20.46C19.07 20.14 16.9 19.43 16.27 17.48C16.1 16.94 16.09 16.39 16.1 15.82' +
  'C16.12 15.13 16.32 14.48 16.71 13.91C18.51 11.3 24 11.19 26.63 12.41C27.83 12.97 28.77 13.96 29.14 15.25' +
  'C29.24 15.62 29.3 16.06 29.3 16.5H23.87C23.6 16.18 23.79 15.51 22.79 15.42C22.14 15.36 21.26 16 21.89 16.64' +
  'C22.55 17.3 24.09 17.34 24.97 17.51C27.52 18 29.9 19.34 29.56 22.31C29.49 22.97 29.24 23.61 28.86 24.15' +
  'C27.03 26.77 21.35 26.78 18.73 25.53C17.42 24.9 16.42 23.84 16.1 22.41C16.03 22.11 16 21.7 16.04 21.36Z';

/** Both letters as one outline. They no longer touch, so it fills, clips and strokes as one shape. */
export const MONOGRAM = T_GLYPH + S_GLYPH;

/**
 * The letters inset by 0.75 units: the bottom of the cut, for skins whose lettering glows from
 * inside (the rune light, the caustic, the melt).
 */
export const MONOGRAM_CORE =
  'M28.49 15.75H24.36Q23.96 14.77 22.86 14.67Q21.95 14.59 21.32 15.25Q20.41 16.2 21.36 17.17' +
  'Q22.05 17.86 24.18 18.15Q24.65 18.21 24.83 18.25Q29.17 19.08 28.81 22.22Q28.73 23.03 28.25 23.72' +
  'Q27.16 25.27 24.03 25.54Q21.05 25.81 19.05 24.85Q17.22 23.97 16.83 22.25Q16.82 22.18 16.8 22.11' +
  'H21.16Q21.6 23.2 22.59 23.3Q23.68 23.4 24.3 22.63Q25.17 21.56 23.98 20.6Q23.28 20.04 21.58 19.8' +
  'Q21.2 19.75 21.03 19.72Q17.59 19.12 16.98 17.25Q16.83 16.77 16.85 15.83Q16.87 15 17.33 14.33' +
  'Q18.4 12.79 21.44 12.47Q24.33 12.17 26.31 13.09Q27.96 13.86 28.42 15.46Q28.46 15.6 28.49 15.75Z' +
  'M16.08 25.25H13.2V16.2Q13.2 15.45 12.45 15.45H9.1V12.45H16.17Q15.85 12.77 15.59 13.14' +
  'Q14.8 14.32 14.75 15.79Q14.73 17.08 14.99 17.89Q15.39 19.13 16.4 20.01H16.04Q14.85 20.01 14.7 21.19' +
  'Q14.61 21.96 14.78 22.71Q15.11 24.18 16.08 25.25Z';

/** The monogram's centre. It sits centred on `MARK_SHEET`, as the art has it. */
const CENTRE_X = 18.97;
const CENTRE_Y = 19;

/** Moves and scales the monogram so its centre lands on `(x, y)`, for sheets of another size. */
export const monogramAt = (x: number, y: number, scale = 1): string =>
  `translate(${x} ${y}) scale(${scale}) translate(${-CENTRE_X} ${-CENTRE_Y})`;

export interface StudioMonogramProps {
  transform?: string;
  /** Defaults to the ink each skin writes on its brand colour. */
  fill?: string;
  fillOpacity?: number;
  className?: string;
}

export const StudioMonogram = ({
  transform,
  fill = 'rgb(var(--brand-contrast))',
  fillOpacity,
  className,
}: StudioMonogramProps) => (
  <path
    d={MONOGRAM}
    transform={transform}
    fill={fill}
    fillOpacity={fillOpacity}
    className={className}
  />
);
