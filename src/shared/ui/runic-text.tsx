import { useMemo } from 'react';

import { useSkin } from '@/app/providers/theme-provider';
import { cn } from '@/shared/lib/cn';
import { emberDelay, runeTokens } from '@/shared/lib/runes';

/**
 * Text, carved.
 *
 * Two things happen here and they are separate on purpose.
 *
 * **The transliteration.** On the runic skin a label is drawn in Elder Futhark;
 * on every other skin this component is a pass-through that renders its
 * children and nothing else. That is what keeps the runes out of eight other
 * themes without a single `skin === ` check at any call site.
 *
 * **The light.** A few runes in each label carry `.rune-ember` and glow on a
 * long, offset cycle — never all of them, never the whole string. A word that
 * pulses as a unit reads as a status; individual glyphs catching light reads as
 * a carved surface with something moving behind it, which is the whole idea.
 *
 * Legibility is handled by never actually taking the Latin away:
 *
 *   - `mode="swap"` keeps both, stacked in one grid cell, and hands the row
 *     over to Latin the moment the pointer or the keyboard reaches it. Both
 *     copies are always in the DOM, so the box is as wide as the wider of the
 *     two and hovering never reflows the rail.
 *   - `mode="always"` (labels that are decoration rather than navigation —
 *     section headings, the hint line under a nav row) stays runic, and the
 *     Latin lives in the tooltip and in the accessible name.
 *
 * Either way the runes are `aria-hidden` and the Latin is what assistive tech
 * reads: this is a typeface joke, and a typeface joke should not reach the
 * accessibility tree.
 */

interface RunicTextProps {
  /** The Latin. Always kept — this component never destroys its input. */
  children: string;
  /**
   * `swap` reverts to Latin under the pointer; `always` stays carved.
   *
   * The default is `swap` because most text that gets this treatment is a
   * navigation label, and a destination you cannot read is a destination you
   * do not click.
   */
  mode?: 'swap' | 'always';
  className?: string;
}

/** Stable per string, so a re-render never reshuffles which runes are lit. */
const seedOf = (text: string): number =>
  text.split('').reduce((total, character) => total + character.charCodeAt(0), 0);

export const RunicText = ({ children, mode = 'swap', className }: RunicTextProps) => {
  const isRunic = useSkin() === 'RUNIC';

  const carved = useMemo(() => {
    if (!isRunic) return null;

    const seed = seedOf(children);

    return runeTokens(children).map((token, index) => {
      const delay = token.isRune ? emberDelay(token.glyph, index, seed) : null;

      return (
        <span
          key={index}
          className={delay === null ? undefined : 'rune-ember'}
          style={delay === null ? undefined : { animationDelay: `${delay}s` }}
        >
          {token.glyph}
        </span>
      );
    });
  }, [children, isRunic]);

  if (!isRunic || !carved) return <>{children}</>;

  if (mode === 'always') {
    return (
      <span className={cn('rune-text', className)} title={children} aria-label={children}>
        <span aria-hidden>{carved}</span>
      </span>
    );
  }

  return (
    <span className={cn('rune-swap', className)} title={children}>
      <span className="rune-swap__carved" aria-hidden>
        {carved}
      </span>
      <span className="rune-swap__latin">{children}</span>
    </span>
  );
};
