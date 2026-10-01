/** Latin → Elder Futhark, for the one skin that writes in it. */

const DIGRAPHS: Record<string, string> = {
  th: 'ᚦ',
  ng: 'ᛜ',
};

const LETTERS: Record<string, string> = {
  a: 'ᚨ',
  b: 'ᛒ',
  c: 'ᚲ',
  d: 'ᛞ',
  e: 'ᛖ',
  f: 'ᚠ',
  g: 'ᚷ',
  h: 'ᚺ',
  i: 'ᛁ',
  j: 'ᛃ',
  k: 'ᚲ',
  l: 'ᛚ',
  m: 'ᛗ',
  n: 'ᚾ',
  o: 'ᛟ',
  p: 'ᛈ',
  q: 'ᚲ',
  r: 'ᚱ',
  s: 'ᛊ',
  t: 'ᛏ',
  u: 'ᚢ',
  v: 'ᚹ',
  w: 'ᚹ',
  x: 'ᛉ',
  y: 'ᛇ',
  z: 'ᛉ',
};

/** One rendered character, and the Latin it came from. */
export interface RuneToken {
  /** What is drawn — a rune, or the original character if it has no rune. */
  glyph: string;
  /** True only for actual runes: spaces and punctuation are never lit. */
  isRune: boolean;
}

/**
 * Transliterate, one token at a time. Returned as tokens rather than a string because the skin
 * lights *individual* runes rather than whole words, and that needs each one to be its own element.
 */
export const runeTokens = (text: string): RuneToken[] => {
  // Accents folded to their letter first: `ã` carves as ᚨ, `ç` as ᚲ. The alphabet has no
  // diacritics, and without this every accented vowel stayed Latin in the middle of a carved word.
  const lower = text
    .toLowerCase()
    .replace(/[^\u0000-\u007f]/g, (character) => character.normalize('NFD')[0] ?? character);
  const tokens: RuneToken[] = [];

  for (let index = 0; index < lower.length; index += 1) {
    const pair = lower.slice(index, index + 2);
    const digraph = DIGRAPHS[pair];

    if (digraph) {
      tokens.push({ glyph: digraph, isRune: true });
      index += 1;
      continue;
    }

    const letter = LETTERS[lower[index]];
    tokens.push(
      letter ? { glyph: letter, isRune: true } : { glyph: text[index], isRune: false },
    );
  }

  return tokens;
};

/** The same thing as a plain string, for attributes and non-React callers. */
export const toRunes = (text: string): string =>
  runeTokens(text)
    .map((token) => token.glyph)
    .join('');

/**
 * Which runes in a word are currently lit. Deterministic, and deliberately not evenly spaced: a
 * fixed stride lights every third rune in every label on screen.
 */
export const emberDelay = (glyph: string, index: number, seed: number): number | null => {
  const hash = (glyph.codePointAt(0) ?? 0) + index * 31 + seed * 17;
  if (hash % 4 !== 0) return null;

  // Spread over the cycle so the lit ones do not pulse together either.
  return Number((((hash >> 2) % 7) * 0.9).toFixed(2));
};
