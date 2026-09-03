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
        'relative inline-flex h-8 w-[3.75rem] shrink-0 items-center rounded-full',
        'border border-edge bg-surface-sunken px-1',
        'transition-colors duration-200 hover:border-brand/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
        'focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        className,
      )}
    >
      {/*
        The knob, under the icons rather than over them.

        `zIndex` is deliberately not set on it: the icons are later in the DOM,
        so they paint on top, and the one the knob is sitting behind reads as
        being *on* the knob. That is what makes the active side look picked up
        rather than merely brighter.
      */}
      <motion.span
        aria-hidden
        className="absolute h-6 w-6 rounded-full bg-brand shadow-sm shadow-brand/40"
        initial={false}
        animate={{ x: isDark ? 27 : 1 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { type: 'spring', stiffness: 520, damping: 34, mass: 0.6 }
        }
      />

      {/* The two ends, fixed. See the note on the component for why they do not
          travel with the knob. */}
      <span
        aria-hidden
        className={cn(
          'relative z-10 grid h-6 w-6 place-items-center transition-colors duration-200',
          isDark ? 'text-content-faint' : 'text-brand-contrast',
        )}
      >
        <Sun className="h-3.5 w-3.5" />
      </span>
      <span
        aria-hidden
        className={cn(
          'relative z-10 ml-auto grid h-6 w-6 place-items-center transition-colors duration-200',
          isDark ? 'text-brand-contrast' : 'text-content-faint',
        )}
      >
        <Moon className="h-3.5 w-3.5" />
      </span>
    </button>
  );
};
