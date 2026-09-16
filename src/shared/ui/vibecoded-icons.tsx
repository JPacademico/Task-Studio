import { cn } from '@/shared/lib/cn';
import { type GlyphProps } from './glyph-kit';

/**
 * The Vibecoded skin's product mark: the logo of every app that has ever been
 * generated.
 *
 * ## What it is
 *
 * A squircle with a 135-degree indigo-to-fuchsia gradient in it, a specular
 * highlight across the top-left, and an abstract white glyph in the middle that
 * is four shapes arranged so as to mean nothing. That is the whole genre, and
 * it is remarkably consistent: the corner radius is always about a quarter of
 * the side, the gradient always runs top-left to bottom-right, and the glyph is
 * always either a swoosh, a node graph, or a hexagon with something inside it.
 *
 * This one is the node graph, because it is the one that most reliably suggests
 * "platform" while committing to nothing at all.
 *
 * ## Why it still carries the letter
 *
 * Every other skin's mark is the *same object* rebuilt in that world's material
 * — a Post-it in starlight, in newsprint, in basalt — and every one of them
 * keeps the `t`. Dropping it here would make this a different product's logo
 * rather than this product's logo drawn badly, and the second is the joke.
 *
 * So the `t` is there, in the middle of the node cluster, at the weight a
 * generated mark would use: geometric, centred, and slightly too small for the
 * space, which is the detail that makes these look machine-made more than any
 * other single thing.
 *
 * ## Why the gradient is hard-coded and not tokenised
 *
 * Because a mark has to survive being drawn outside its own theme — the theme
 * gallery paints all fifteen at once, on whatever skin the reader is wearing.
 * Every other mark in this set takes `currentColor` for the same reason it is
 * allowed to: it is a *shape*, and the shape is the identity. Here the gradient
 * *is* the identity, so it is a literal, and the `id` is suffixed to survive
 * two copies of it in one document.
 */
export const VibecodedMark = ({ className }: GlyphProps) => (
  <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn('h-10 w-10', className)}>
    <defs>
      <linearGradient id="vibe-mark-fill" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366F1" />
        <stop offset="0.55" stopColor="#A855F7" />
        <stop offset="1" stopColor="#D946EF" />
      </linearGradient>
      {/* The highlight: a soft white wash over the top-left third. There is
          always a highlight, and it never corresponds to a light source. */}
      <linearGradient id="vibe-mark-sheen" x1="4" y1="4" x2="26" y2="26" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFFFFF" stopOpacity="0.45" />
        <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
      </linearGradient>
    </defs>

    {/* The squircle. `rx` is a quarter of the side, which is the ratio these
        always land on — large enough to read as friendly, small enough that it
        is not a circle. */}
    <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#vibe-mark-fill)" />
    <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#vibe-mark-sheen)" />

    {/*
      The node cluster: three dots and two connectors, which is the minimum
      that reads as "a network" and the maximum that fits at 20px. Drawn at
      0.55 opacity so it sits behind the letter rather than competing with it —
      the generated version never gets this right, but a mark that renders at
      20px in the rail has to.
    */}
    <g stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round">
      <path d="M13 26.5 20 13l7 13.5" />
    </g>
    <g fill="#FFFFFF" fillOpacity="0.85">
      <circle cx="20" cy="12" r="2.6" />
      <circle cx="12.4" cy="27.2" r="2.2" />
      <circle cx="27.6" cy="27.2" r="2.2" />
    </g>

    {/*
      The letter, centred in the cluster.

      Geometric rather than written: a single stem with a crossbar and no
      terminal, which is what you get when a letterform is drawn as two
      rectangles instead of as a letter. Every other skin's `t` has a hand in it
      somewhere; this one deliberately does not.
    */}
    <path
      d="M20 17.6v6.2c0 .9.5 1.3 1.4 1.3h1"
      stroke="#FFFFFF"
      strokeWidth="2.2"
      strokeLinecap="round"
      fill="none"
    />
    <path d="M17.8 19.2h4.4" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);
