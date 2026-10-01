import { startTransition, useEffect, useState } from 'react';

/**
 * The active skin's palette, as hex, for things that cannot read a CSS variable. Every colour in
 * the product resolves through a custom property.
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
 * `"14 116 144"` → `"#0e7490"`. The tokens are stored as bare RGB triplets so Tailwind can compose
 * them with an alpha (`rgb(var(--brand) / 0.4)`).
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
 * The palette, kept in step with the theme. Read lazily on first render rather than in an effect,
 * so the first frame a canvas draws is already the right colour.
 */
export const useThemePalette = (): ThemePalette => {
  const [palette, setPalette] = useState<ThemePalette>(readPalette);

  useEffect(() => {
    // Only the two changes that can move a token: the `dark` class and the skin. `<html>` carries
    // other classes that come and go.
    const signature = () =>
      `${document.documentElement.classList.contains('dark')}|${document.documentElement.dataset.skin ?? ''}`;
    let last = signature();

    const observer = new MutationObserver(() => {
      const next = signature();
      if (next === last) return;
      last = next;

      const read = readPalette();
      // Non-urgent: a canvas catching up a frame later is invisible, a canvas
      // re-render blocking the frame the palette wave is drawing is not.
      startTransition(() =>
        setPalette((current) =>
          TOKENS.every((token) => current[token] === read[token]) ? current : read,
        ),
      );
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-skin'],
    });

    // One read after mount as well. `ThemeProvider` applies the stored skin in an effect, and
    // effects in a child run before the provider's own on the first commit.
    setPalette(readPalette());

    return () => observer.disconnect();
  }, []);

  return palette;
};
