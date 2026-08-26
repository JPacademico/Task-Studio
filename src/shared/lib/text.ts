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

/**
 * Keeps a paste inside a field's ceiling, and inserts as much of it as fits.
 *
 * ## Why `maxlength` and `clampText` are not the whole story
 *
 * They are the whole story for *correctness*: a controlled field that clamps in
 * `onChange` can never hold more than the limit, however the text arrived. What
 * they are not is *honest*. Pasting four thousand characters into a
 * two-thousand ceiling silently drops half of it, mid-word, with nothing on
 * screen to say so — and the person who did it finds out later, if at all.
 *
 * This makes the same clamp explicit. It replaces the selection with exactly
 * the number of characters there is room for, leaves the caret after them, and
 * hands back what it had to drop so the caller can say something about it.
 *
 * ## Why it re-implements the insertion instead of letting the browser do it
 *
 * Because the browser's own `maxlength` truncation is applied to the *result*,
 * which is a different rule when there is a selection: replacing a 500-character
 * selection with a 600-character paste is a net gain of 100, and the browser
 * will happily allow it while a naive length check would refuse. Computing the
 * next value here means one rule — the field's limit, applied to what the field
 * would end up holding.
 *
 * `document.execCommand('insertText')` is deprecated but is still the only way
 * to write into an input while keeping the browser's native undo stack, which
 * matters: a paste somebody cannot Ctrl-Z is worse than a paste that was
 * trimmed. It falls back to a direct value write plus an `input` event when the
 * command is unavailable, so a controlled React field still sees the change.
 *
 * Returns the number of characters that did not fit, so `0` means the paste
 * arrived whole.
 */
export const clampOnPaste = (
  event: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  limit: number,
): number => {
  const pasted = event.clipboardData.getData('text');
  if (!pasted) return 0;

  const field = event.currentTarget;
  const start = field.selectionStart ?? field.value.length;
  const end = field.selectionEnd ?? start;

  // What the field would hold if the whole paste went in.
  const roomAfterReplacement = limit - (field.value.length - (end - start));
  if (roomAfterReplacement >= pasted.length) return 0;

  event.preventDefault();

  const fitted = pasted.slice(0, Math.max(0, roomAfterReplacement));
  if (fitted) {
    const inserted = document.execCommand?.('insertText', false, fitted);

    if (!inserted) {
      // No `execCommand` (or it refused): write the value directly and tell
      // React, which is listening for `input` rather than for `change`.
      field.value = field.value.slice(0, start) + fitted + field.value.slice(end);
      field.setSelectionRange(start + fitted.length, start + fitted.length);
      field.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  return pasted.length - fitted.length;
};
