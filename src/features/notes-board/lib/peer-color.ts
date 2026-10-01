/**
 * How many distinct colours a board can show before two people share one. Twelve, spaced evenly
 * round the wheel.
 */
const WHEEL = 12;

/**
 * The offset, and the one number here that is not arbitrary. Hue 0 is red, which every skin in this
 * product already spends on danger and destructive actions.
 */
const START_HUE = 205;

/**
 * A stable colour for one person, on every board and in every browser. The obvious design is for
 * the server to hand out colours as people arrive, which guarantees no collisions.
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
