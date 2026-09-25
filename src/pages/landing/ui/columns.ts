/**
 * How wide the landing page's columns get — and how they keep growing on
 * screens the root scale has stopped growing for.
 *
 * ## The problem this answers
 *
 * The page was built on `max-w-6xl`, which is `72rem`: it already rides the
 * fluid root size in `index.css`, so it grows from a laptop up to about
 * 1440p. Past that the root is clamped, and the column stopped with it — a
 * 2560 monitor showed the page in a ~1400px strip, and a 3440 ultrawide in the
 * same strip with a thousand pixels of empty band on either side. That is the
 * exact complaint the app shell answered with `max(87.5rem, 78vw)` in
 * `AppLayout`; this is the same idea, sized for a page that is read rather
 * than worked in.
 *
 * ## The shape of it
 *
 * Below 1600px every column is exactly the Tailwind width it always was, so
 * no laptop layout moves. From 1600px up the cap becomes `max(rem, vw)`: the
 * `rem` term keeps it from ever being narrower than before, and the `vw` term
 * lets it follow the window — at a lower fraction than the app's 78%, because
 * a marketing column is prose and demos, and a line of copy stretched across
 * a television is one nobody can track back to the start of. `min(…rem, …)` is
 * the backstop for the ultrawide.
 *
 *   - `COLUMN` — the default section, the nav and the footer. 62% of the window.
 *   - `COLUMN_WIDE` — the one section that is a board rather than a column
 *     (see `FeatureNotes`), which earns a little more.
 *   - `COLUMN_NARROW` — the footer's three Post-its, which are a row of
 *     objects and should stay a row of objects rather than drift apart.
 *
 * Whole class strings, written out: Tailwind finds classes by reading the
 * source, so a width assembled at runtime would never be generated.
 */
export const COLUMN = 'max-w-6xl min-[1600px]:max-w-[min(96rem,max(72rem,62vw))]';

export const COLUMN_WIDE = 'max-w-7xl min-[1600px]:max-w-[min(108rem,max(80rem,68vw))]';

export const COLUMN_NARROW = 'max-w-5xl min-[1600px]:max-w-[min(84rem,max(64rem,54vw))]';
