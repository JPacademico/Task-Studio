import { cn } from '@/shared/lib/cn';
import { type GlyphProps } from './glyph-kit';
import { StudioLetter } from './studio-letter';

/**
 * This skin's product mark. Its navigation set is gone.
 *
 * There used to be a full set of eldritch navigation glyphs here, exported as
 * `ELDRITCH_GLYPHS` and swapped in by `NavGlyph`. Every skin's set has
 * been withdrawn for the reason written up there: an icon is recognised by
 * shape, and a rail whose shapes change with the theme charges every user that
 * recognition again for a novelty that lands once.
 *
 * The mark is a different thing and stays. It is the *product's* signature
 * drawn in this world — one object, seen once, on a settings card and a theme
 * gallery tile — and nobody navigates by it.
 */
/**
 * The product mark: the note, and what got into it.
 *
 * The sheet is the same square of paper every other skin introduces the
 * product with — the signature does not change from world to world, only what
 * the world has done to it. Here it has been in the wrong room: the corner is
 * curling of its own accord, an eye has opened in the middle of the writing,
 * and something has come up over the bottom edge to hold it down.
 */
export const EldritchMark = ({ className }: GlyphProps) => (
  <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn('h-10 w-10', className)}>
    {/* The sheet behind, so the mark reads as a pad and not one page. */}
    <path
      d="M11 9h21v17l-6 6H11V9Z"
      fill="currentColor"
      fillOpacity="0.18"
      stroke="currentColor"
      strokeOpacity="0.3"
      strokeWidth="1.3"
      strokeLinejoin="round"
      transform="rotate(4 20 20)"
    />

    {/* The page. Grown corners, matching every box in the skin. */}
    <path
      d="M5 8.5C5 6.6 6.4 5 8.2 5H31v18.5L23.5 32H7.6C6.2 32 5 30.7 5 29.2V8.5Z"
      fill="currentColor"
      fillOpacity="0.9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />

    {/* The corner, lifting on its own. */}
    <path
      d="M23.5 32v-6a2.5 2.5 0 0 1 2.5-2.5h5"
      fill="none"
      stroke="rgb(var(--eldritch-ichor))"
      strokeWidth="1.5"
      strokeLinejoin="round"
      opacity="0.9"
    />

    {/* The letter, written on the page. */}
    <StudioLetter transform="translate(5.8 9.9) scale(0.745)" strokeOpacity={0.9} />

    {/*
      And the eye, which has moved aside to let it through.

      It used to sit in the middle of the sheet with a line of writing above and
      below — the eye *was* the third line. The letter needs that middle now, so
      the eye is smaller and off to the right, watching it. That reads better
      than it did: something looking at the writing is a stranger idea than
      something interrupting it.

      Still the raised-surface colour, so it is a hole through the sheet rather
      than ink on it.
    */}
    <ellipse
      cx="24.6"
      cy="15.4"
      rx="5.2"
      ry="3.2"
      fill="rgb(var(--surface-raised))"
      fillOpacity="0.92"
      stroke="rgb(var(--eldritch-glow))"
      strokeWidth="1.3"
    />
    <circle cx="24.6" cy="15.4" r="1.8" fill="currentColor" />
    <circle cx="23.8" cy="14.6" r="0.6" fill="rgb(var(--surface-raised))" opacity="0.9" />

    {/* And what came up over the bottom edge to keep it there. */}
    <g stroke="rgb(var(--eldritch-ichor))" strokeWidth="1.7" strokeLinecap="round" fill="none">
      <path d="M8 32c0 3-2.4 3.6-3.6 2.4s-.4-3 1.2-2.6" />
      <path d="M14.5 32c.4 3.4-1.6 5-3.4 4.2" />
      <path d="M20.5 31.6c1 2.8 3.4 3.6 4.8 2.6" />
    </g>
  </svg>
);
