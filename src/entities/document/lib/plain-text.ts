/** The three characters that would otherwise open a tag nobody wrote. */
const escapeText = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Plain text to the editor's HTML. Blank-line separated blocks become paragraphs, and a single
 * newline inside one becomes a `<br>`.
 */
export const plainTextToHtml = (text: string): string => {
  const paragraphs = text
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);

  if (paragraphs.length === 0) return '';

  return paragraphs
    .map((block) => `<p>${escapeText(block).replace(/\n/g, '<br />')}</p>`)
    .join('');
};

/** How much of a `.txt` becomes a page. */
export const MAX_PLAIN_TEXT_CHARS = 180_000;
