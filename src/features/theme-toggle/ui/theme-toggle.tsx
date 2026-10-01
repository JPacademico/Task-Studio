import { motion, useReducedMotion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';

import { useTheme } from '@/app/providers/theme-provider';
import { prepareWave } from '@/app/providers/theme-wave';
import { useT } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';

/**
 * Light or dark, as a switch rather than a button. It was a 36px square that showed a sun in light
 * mode and a moon in dark.
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
      // The wave's keyframes are built while the pointer is on its way to the
      // press rather than inside it. See `prepareWave`.
      onPointerEnter={prepareWave}
      onFocus={prepareWave}
      aria-label={t('theme.switchLabel')}
      title={isDark ? t('theme.toLight') : t('theme.toDark')}
      className={cn(
        'relative inline-block h-8 w-[3.75rem] shrink-0 rounded-full align-middle',
        /* Glass, rather than a sunken well. It was `bg-surface-sunken` with a hairline border. */
        'ui-liquid-glass ui-liquid-glass--control ui-liquid-glass--interactive',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
        'focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        className,
      )}
    >
      {/* Two layers over the same box, so the knob and the icons cannot disagree. Two of them,
          and they compounded. */}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-1 flex items-center',
          isDark ? 'justify-end' : 'justify-start',
        )}
      >
        <motion.span
          layout
          /* The knob is a bead of the same glass, not a flat disc. It keeps the brand fill — the
             knob is the one part of this control that has to be found at a glance. */
          className={cn(
            'h-6 w-6 rounded-full bg-brand',
            'shadow-[inset_0_1px_0_0_rgb(var(--glass-rim)/0.55),inset_0_-1px_0_0_rgb(0_0_0/0.25),0_2px_6px_-1px_rgb(var(--brand)/0.5)]',
          )}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { type: 'spring', stiffness: 520, damping: 34, mass: 0.6 }
          }
        />
      </span>

      {/* The two ends, fixed, in the same box the knob travels along. They paint over it, so
          the active one reads as sitting *on* the knob rather than beside it. */}
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
