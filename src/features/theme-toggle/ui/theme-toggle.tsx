import { motion, useReducedMotion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';

import { useTheme } from '@/app/providers/theme-provider';
import { useT } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';

/**
 * Light or dark, as a switch rather than a button.
 *
 * ## Why it stopped being an icon
 *
 * It was a 36px square that showed a sun in light mode and a moon in dark, and
 * the problem with that is the one thing an icon-only toggle can never settle:
 * a sun on its own does not say whether it is describing the state you are in
 * or the state you would get by pressing it. Both readings are common, they are
 * opposites, and nothing on the control distinguishes them — so the honest
 * answer for most people was "press it and find out".
 *
 * A switch cannot be ambiguous in that way, because it shows *both* ends at
 * once. The sun and the moon are always visible, the knob sits on the one that
 * is currently true, and the direction it would travel is the change on offer.
 * Nobody has to guess, and nobody has to have read a convention.
 *
 * ## Why the knob is a separate element from the icons
 *
 * So the icons never move. A switch that slid the sun and moon along with the
 * knob would be animating three things to communicate one, and the two symbols
 * are the labels — labels that move are labels you re-read. The track holds
 * them at fixed positions and only the knob travels between them.
 *
 * ## Why both icons stay lit
 *
 * The inactive one is dimmed rather than hidden. Hiding it would put the
 * control straight back into the ambiguity it exists to remove: one symbol
 * visible is one symbol to misread. Dimmed, it still reads as "the other
 * option", which is exactly what it is.
 *
 * ## Accessibility
 *
 * A real `role="switch"` with `aria-checked`, so assistive technology announces
 * it as the two-state control it looks like rather than as a button whose
 * effect has to be inferred from its name. Checked means dark — an arbitrary
 * choice, made once, and stated here so it stays consistent.
 */
export const ThemeToggle = ({ className }: { className?: string }) => {
  const t = useT();
  const reduceMotion = useReducedMotion();
  const { isDark, toggle } = useTheme();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={toggle}
      aria-label={t('theme.switchLabel')}
      title={isDark ? t('theme.toLight') : t('theme.toDark')}
      className={cn(
        'relative inline-block h-8 w-[3.75rem] shrink-0 rounded-full align-middle',
        'border border-edge bg-surface-sunken',
        'transition-colors duration-200 hover:border-brand/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
        'focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        className,
      )}
    >
      {/*
        Two layers over the same box, so the knob and the icons cannot disagree.

        ## What was wrong before

        Two of them, and they compounded. The knob was placed with Tailwind's
        `top-1/2 -translate-y-1/2` *and* animated with Framer's `x` — and Framer
        writes `transform` as an inline style, which overrides the Tailwind
        translate entirely. So the knob's top edge sat on the track's centre
        line and it hung a full half-height low. The same collision is on record
        against `FeatureNotes` and `ChatPin`; it catches everything that mixes a
        transform utility with an animated transform.

        The second was a hand-computed travel distance of 28px, derived from a
        60px track that is really 58.6 — `3.75rem` against this app's 15.625px
        root — and from ignoring the 1px border on each side. Measured, the knob
        landed 2.7px right of the moon it was supposed to be under.

        ## Why this cannot drift

        Both layers are `inset-1`, so they are literally the same rectangle. The
        icon row is `justify-between`; the knob row is `justify-start` or
        `justify-end`. "The knob is on the moon" is therefore the same statement
        as "the last flex item is at the end of the row" — true at any track
        width, any root font size, any border, with no number written down
        anywhere. `layout` lets Framer animate the change of alignment rather
        than a distance nobody has to compute.
      */}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-1 flex items-center',
          isDark ? 'justify-end' : 'justify-start',
        )}
      >
        <motion.span
          layout
          className="h-6 w-6 rounded-full bg-brand shadow-sm shadow-brand/40"
          transition={
            reduceMotion
              ? { duration: 0 }
              : { type: 'spring', stiffness: 520, damping: 34, mass: 0.6 }
          }
        />
      </span>

      {/* The two ends, fixed, in the same box the knob travels along. They paint
          over it, so the active one reads as sitting *on* the knob rather than
          beside it. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-1 z-10 flex items-center justify-between"
      >
        <span
          className={cn(
            'grid h-6 w-6 place-items-center transition-colors duration-200',
            isDark ? 'text-content-faint' : 'text-brand-contrast',
          )}
        >
          <Sun className="h-3.5 w-3.5" />
        </span>
        <span
          className={cn(
            'grid h-6 w-6 place-items-center transition-colors duration-200',
            isDark ? 'text-brand-contrast' : 'text-content-faint',
          )}
        >
          <Moon className="h-3.5 w-3.5" />
        </span>
      </span>
    </button>
  );
};
