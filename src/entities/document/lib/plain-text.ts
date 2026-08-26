/** The three characters that would otherwise open a tag nobody wrote. */
const escapeText = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Plain text to the editor's HTML.
 *
 * Blank-line separated blocks become paragraphs, and a single newline inside
 * one becomes a `<br>` — the reading every plain-text-to-rich-text converter
 * has used since mail clients started drawing HTML, and the one that matches
 * how people actually write `.txt`.
 *
 * ## Why this runs in the browser
 *
 * Because there is no judgement in it. The whole reason an imported PDF or
 * `.docx` waits for the Edit button is that turning one into a document is a
 * model's reading of somebody's work and costs a call to make; turning plain
 * text into paragraphs is a `split`. Doing it here means a `.txt` lands as an
 * ordinary editable page with no round trip, no waiting and no quota spent.
 *
 * The API keeps its own copy of this (`plainTextToHtml` in
 * `document-conversion.service.ts`) and sanitises whatever arrives regardless
 * — "the client produced it" has never been a reason to trust a body.
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

/**
 * How much of a `.txt` becomes a page.
 *
 * Matches the API's document column ceiling with room to spare for the markup
 * this function adds around it — a page that converted in the browser and was
 * then refused by the save would be the worst of both.
 */
export const MAX_PLAIN_TEXT_CHARS = 180_000;
