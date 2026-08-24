/**
 * Cutting user text down to a length the rest of the app can rely on.
 *
 * ## Why `maxLength` is not enough on its own
 *
 * `maxlength` is an attribute the *browser* enforces, and only against edits it
 * considers typing: it stops a long paste into a focused field, and it does not
 * stop text dropped onto the field, a value written by an extension or a
 * password manager, or a value this app itself put there — a suggestion
 * promoted into a step, a title carried over from somewhere else. Those all
 * arrive through React's `onChange` (or through no event at all), which is why
 * the controlled fields clamp what they store rather than trusting the
 * attribute alone. The attribute stays, because it is what makes the ceiling
 * visible while somebody types instead of silently swallowing the tail.
 */

/** `value`, cut to `limit` characters. Whitespace is left alone — trimming is the caller's decision. */
export const clampText = (value: string, limit: number): string =>
  value.length > limit ? value.slice(0, limit) : value;

/**
 * `value` for display, cut to `limit` with an ellipsis if it had to be.
 *
 * For text that is already stored — rows written before a limit existed, or by
 * an API that does not share this one. Laying out a hundred thousand
 * characters inside a card is expensive whether or not anybody can read it.
 */
export const truncateText = (value: string, limit: number): string =>
  value.length > limit ? `${value.slice(0, limit).trimEnd()}…` : value;
