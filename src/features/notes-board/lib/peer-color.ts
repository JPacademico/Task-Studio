/**
 * How many distinct colours a board can show before two people share one.
 *
 * Twelve, spaced evenly round the wheel. A project can have more members than
 * that, and two of them colliding is an acceptable and recoverable confusion —
 * the pointer and the lock ribbon both carry a *name* beside the colour, so
 * the colour is a way of telling two things apart at a glance rather than the
 * thing that identifies them.
 *
 * Going wider is not free: past about twelve hues the steps are smaller than
 * the difference a person can reliably see between two small moving dots,
 * which trades a rare collision for a constant one.
 */
const WHEEL = 12;

/**
 * The offset, and the one number here that is not arbitrary.
 *
 * Hue 0 is red, which every skin in this product already spends on danger and
 * destructive actions, and hue 120 is the green they spend on success. Landing
 * a colleague's pointer on either would make it read as a state rather than as
 * a person. Starting at 205 — a mid blue — puts the first, most likely colours
 * in the blue/violet/magenta arc that nothing in the interface uses, and the
 * ones that do reach red and green arrive there as the seventh or eighth
 * person on a board.
 */
const START_HUE = 205;

/**
 * A stable colour for one person, on every board and in every browser.
 *
 * ## Why it is derived rather than assigned
 *
 * The obvious design is for the server to hand out colours as people arrive,
 * which guarantees no collisions. It also means the colour is *state*: it has
 * to be stored, kept in step across the room, reassigned when somebody leaves,
 * and answered for a late joiner. And it makes a person's colour depend on the
 * order people arrived in, so the same colleague is blue in the morning and
 * orange after lunch — which defeats the purpose, because the value of a
 * per-person colour is entirely in it being learnable.
 *
 * Deriving it from the user id costs nothing, needs no coordination, and gives
 * the same answer on every client forever.
 *
 * ## Why not `avatarColor`
 *
 * `shared/lib/colors` already has a per-user hue, and reusing it was the first
 * thing tried. It is the wrong one here for two reasons. It is tuned to sit
 * *behind white initials*, so it is mid-lightness and mid-saturation — which
 * is exactly the range a Post-it is already painted in, so a pointer over a
 * note disappeared into it. And its hash is unbounded, so two ids can land a
 * couple of degrees apart and be indistinguishable as moving dots even though
 * they are technically different colours.
 *
 * This quantises to twelve slots, which makes near-collisions impossible, and
 * runs darker and much more saturated so the arrow reads as ink on top of
 * paper rather than as part of it.
 */
export const peerColor = (userId: string): string => {
  let hash = 0;
  for (let index = 0; index < userId.length; index += 1) {
    // The same mixing function `avatarColor` uses — `hash * 31 + char`, written
    // as a shift — so two functions over the same ids stay comparably spread.
    hash = userId.charCodeAt(index) + ((hash << 5) - hash);
  }

  const slot = Math.abs(hash) % WHEEL;
  return `hsl(${(START_HUE + slot * (360 / WHEEL)) % 360} 74% 46%)`;
};
