/**
 * Latin → Elder Futhark, for the one skin that writes in it.
 *
 * Real Unicode runes (U+16A0–16FF), not a picture font: the text stays text, so
 * it can be selected, searched by the browser's find, read out by a screen
 * reader that knows the block, and — the part that matters here — reflowed and
 * scaled like the type it is.
 *
 * The mapping is the ordinary scholarly transliteration run backwards, with two
 * digraphs (`th` → ᚦ, `ng` → ᛜ) because those are single runes and spelling
 * them as two is the tell that a transliterator was written in five minutes.
 * Letters with no rune of their own borrow the nearest sound, which is what the
 * alphabet itself did: `c` and `q` ride on ᚲ, `v` on ᚹ, `x` on ᛉ.
 *
 * Nothing here is reversible and nothing needs to be. This is decoration over
 * text the app still holds in Latin — every surface that renders runes keeps
 * the original for its tooltip, its `aria-label` and its hover state.
 */

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
 * Transliterate, one token at a time.
 *
 * Returned as tokens rather than a string because the skin lights *individual*
 * runes rather than whole words, and that needs each one to be its own element.
 * Callers that only want the text can join the glyphs.
 */
export const runeTokens = (text: string): RuneToken[] => {
  const lower = text.toLowerCase();
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
 * Which runes in a word are currently lit.
 *
 * Deterministic, and deliberately not evenly spaced: a fixed stride lights
 * every third rune in every label on screen, and a column of nav rows glowing
 * in lockstep reads as a loading state rather than as stone catching light. The
 * hash mixes the character with its position, so two different words of the
 * same length light differently and the same word always lights the same way —
 * which matters because the alternative is a label that reshuffles its glow
 * every time React re-renders it.
 *
 * Returns the animation delay in seconds, or `null` for a rune that stays dark.
 */
export const emberDelay = (glyph: string, index: number, seed: number): number | null => {
  const hash = (glyph.codePointAt(0) ?? 0) + index * 31 + seed * 17;
  if (hash % 4 !== 0) return null;

  // Spread over the cycle so the lit ones do not pulse together either.
  return Number((((hash >> 2) % 7) * 0.9).toFixed(2));
};
