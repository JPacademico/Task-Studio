import { useMemo } from 'react';

import { useSkin } from '@/app/providers/theme-provider';
import { cn } from '@/shared/lib/cn';
import { emberDelay, runeTokens } from '@/shared/lib/runes';

/** Text, carved. */

interface RunicTextProps {
  /** The Latin. Always kept — this component never destroys its input. */
  children: string;
  /**
   * `swap` reverts to Latin under the pointer; `always` stays carved. The default is `swap` because
   * most text that gets this treatment is a navigation label.
   */
  mode?: 'swap' | 'always';
  /**
   * Lets the swap wrap onto several lines, for text that is a sentence rather than a label — a
   * Post-it, say.
   */
  wrap?: boolean;
  className?: string;
}

/** Stable per string, so a re-render never reshuffles which runes are lit. */
const seedOf = (text: string): number =>
  text.split('').reduce((total, character) => total + character.charCodeAt(0), 0);

export const RunicText = ({ children, mode = 'swap', wrap = false, className }: RunicTextProps) => {
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
    <span className={cn('rune-swap', wrap && 'rune-swap--wrap', className)} title={children}>
      <span className="rune-swap__carved" aria-hidden>
        {carved}
      </span>
      <span className="rune-swap__latin">{children}</span>
    </span>
  );
};
