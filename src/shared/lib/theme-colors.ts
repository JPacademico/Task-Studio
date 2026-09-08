import { useEffect, useState } from 'react';

/**
 * The active skin's palette, as hex, for things that cannot read a CSS variable.
 *
 * ## Why this exists
 *
 * Every colour in the product resolves through a custom property — that is what
 * makes thirteen skins and two palettes cost one attribute mutation instead of a
 * re-render. WebGL does not participate in the cascade. A shader is handed
 * floats, a `three` material is handed a `Color`, and neither has any way to ask
 * the document what `--brand` currently is.
 *
 * So the values are read out of the cascade once, at the only place that can do
 * it — `getComputedStyle` on the root element — and handed to the canvas as
 * plain strings. The alternative is hard-coding the accent in every 3D surface,
 * which is how a background ends up petrol blue on a volcano skin.
 *
 * ## Why it re-reads on a theme change
 *
 * `ThemeProvider` switches the palette by writing `class="dark"` and
 * `data-skin="…"` on `<html>`; nothing re-renders and no React state carries the
 * colours. A `MutationObserver` on exactly those two attributes is the only
 * signal available, and it is a cheap one: two attributes on one element, fired
 * at most once per deliberate theme change.
 */

/** The tokens a 3D surface is allowed to ask for. Kept small on purpose. */
const TOKENS = [
  'brand',
  'brand-soft',
  'surface',
  'surface-raised',
  'surface-sunken',
  'content',
  'edge',
  'positive',
  'warning',
] as const;

export type ThemeToken = (typeof TOKENS)[number];
export type ThemePalette = Record<ThemeToken, string>;

/**
 * `"14 116 144"` → `"#0e7490"`.
 *
 * The tokens are stored as bare RGB triplets so Tailwind can compose them with
 * an alpha (`rgb(var(--brand) / 0.4)`); `three` wants something its `Color`
 * constructor understands, and hex is the one spelling every graphics library
 * agrees on. A token that is missing or in an unexpected shape falls back to
 * mid-grey rather than throwing — a wrong colour in a decorative background is
 * a blemish, and an exception thrown out of a `getComputedStyle` call during a
 * paint is a blank page.
 */
const tripletToHex = (value: string): string => {
  const parts = value.trim().split(/[\s,]+/).map(Number);
  if (parts.length < 3 || parts.some((part) => !Number.isFinite(part))) return '#808080';

  return `#${parts
    .slice(0, 3)
    .map((part) => Math.max(0, Math.min(255, Math.round(part))).toString(16).padStart(2, '0'))
    .join('')}`;
};

const readPalette = (): ThemePalette => {
  // SSR and the prerender pass have no document. The defaults are the studio
  // light palette, which is what the page paints before hydration anyway.
  if (typeof document === 'undefined') {
    return {
      brand: '#0e7490',
      'brand-soft': '#cff0f6',
      surface: '#f6f6f8',
      'surface-raised': '#ffffff',
      'surface-sunken': '#ebebf0',
      content: '#181820',
      edge: '#dbdbe4',
      positive: '#10b981',
      warning: '#f59e0b',
    };
  }

  const styles = getComputedStyle(document.documentElement);

  return Object.fromEntries(
    TOKENS.map((token) => [token, tripletToHex(styles.getPropertyValue(`--${token}`))]),
  ) as ThemePalette;
};

/**
 * The palette, kept in step with the theme.
 *
 * Read lazily on first render rather than in an effect, so the first frame a
 * canvas draws is already the right colour — reading it afterwards would show
 * one frame of the fallback palette on every mount, which on a skin as far from
 * the default as `volcano` is a visible flash of the wrong product.
 */
export const useThemePalette = (): ThemePalette => {
  const [palette, setPalette] = useState<ThemePalette>(readPalette);

  useEffect(() => {
    const observer = new MutationObserver(() => setPalette(readPalette()));

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-skin'],
    });

    /*
     * One read after mount as well.
     *
     * `ThemeProvider` applies the stored skin in an effect, and effects in a
     * child run before the provider's own on the first commit — so a canvas
     * mounted inside it can genuinely render once against the document's
     * pre-theme state. The observer catches every *later* change and this
     * catches the first one.
     */
    setPalette(readPalette());

    return () => observer.disconnect();
  }, []);

  return palette;
};
