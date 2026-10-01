/**
 * Cutting user text down to a length the rest of the app can rely on. `maxlength` is an attribute
 * the *browser* enforces, and only against edits it considers typing.
 */

/** `value`, cut to `limit` characters. Whitespace is left alone — trimming is the caller's decision. */
export const clampText = (value: string, limit: number): string =>
  value.length > limit ? value.slice(0, limit) : value;

/**
 * `value` for display, cut to `limit` with an ellipsis if it had to be. For text that is already
 * stored — rows written before a limit existed, or by an API that does not share this one.
 */
export const truncateText = (value: string, limit: number): string =>
  value.length > limit ? `${value.slice(0, limit).trimEnd()}…` : value;

/**
 * Keeps a paste inside a field's ceiling, and inserts as much of it as fits. They are the whole
 * story for *correctness*.
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
