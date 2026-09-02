import { Link } from 'react-router-dom';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

import { useTheme } from '@/app/providers/theme-provider';
import { cn } from '@/shared/lib/cn';
import { SETTINGS_SKIN_LIMIT, SKIN_CATALOG } from '../model/skin-catalog';
import { SkinMock } from './skin-mock';
import { useT } from '@/shared/i18n';

/**
 * The theme control on the settings page.
 *
 * It used to be the whole catalogue, and every theme added to the product made
 * the settings page taller — eight mocks and eight names is a wall to read
 * through on the way to changing your password. So settings now shows one row:
 * whatever is active, plus enough of the others to make it obvious there are
 * others, and then it hands off.
 *
 * The active skin is pinned to the front deliberately. A picker that can be
 * showing a set the current choice is not in has no way to tell you what you
 * are using, which is the first question anybody opens it with.
 */
export const SkinPicker = () => {
  const t = useT();
  const { skin, setSkin, isDark } = useTheme();

  const active = SKIN_CATALOG.find((option) => option.value === skin);
  const rest = SKIN_CATALOG.filter((option) => option.value !== skin);
  const shown = [...(active ? [active] : []), ...rest].slice(0, SETTINGS_SKIN_LIMIT);
  const remaining = SKIN_CATALOG.length - shown.length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {shown.map((option) => {
          const isActive = skin === option.value;
          const preview = isDark ? option.dark : option.light;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setSkin(option.value)}
              aria-pressed={isActive}
              className={cn(
                'group relative overflow-hidden rounded-2xl border p-2 text-left transition-all duration-200 ease-studio',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
                isActive
                  ? 'border-brand bg-brand/[0.07] shadow-panel'
                  : 'border-edge bg-surface-raised hover:-translate-y-0.5 hover:border-brand/50',
              )}
            >
              <SkinMock preview={preview} className="w-full" />

              <div className="flex items-center gap-2 px-1 pb-0.5 pt-2">
                <p className="flex min-w-0 flex-1 items-center gap-1.5 text-sm font-semibold">
                  <span className="truncate">{option.name}</span>
                  {option.value === 'STUDIO' && (
                    <span className="shrink-0 rounded-full bg-surface-sunken px-1.5 py-px text-4xs font-medium uppercase tracking-wide text-content-faint">
                      {t('themes.defaultSkin')}
                    </span>
                  )}
                </p>

                {isActive && (
                  <motion.span
                    layoutId="skin-check"
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand text-brand-contrast"
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </motion.span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/*
        The way out of settings.

        Deliberately a full-width bar rather than a fourth tile: a tile would
        read as a fourth theme, and this is the opposite — it is the door to all
        of them. The sheen is a single transform on a skewed span, so it costs a
        compositor layer only while the pointer is actually over the control.
      */}
      <Link
        to="/themes"
        // Deliberately not wearing `ui-btn`: that hook hands the element the
        // skin's button casing, and half the themes set it to uppercase — which
        // would shout the subtitle underneath as well as the label.
        className={cn(
          'group relative flex items-center gap-3 overflow-hidden rounded-2xl border-2 border-brand/40',
          'bg-gradient-to-r from-brand/15 via-brand/[0.07] to-transparent px-4 py-3',
          'transition-all duration-200 ease-studio hover:border-brand hover:from-brand/25',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
        )}
      >
        <span className="absolute inset-0 -translate-x-full skew-x-12 bg-gradient-to-r from-transparent via-brand/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

        <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand text-brand-contrast shadow-[0_8px_18px_-10px_rgb(var(--brand))]">
          <Sparkles className="h-4 w-4" strokeWidth={2.4} />
        </span>

        <span className="relative min-w-0 flex-1 leading-tight">
          <span className="block text-sm font-bold tracking-tight">{t('themes.browse')}</span>
          <span className="block truncate text-2xs text-content-muted">
            {remaining > 0
              ? t('themes.moreInGallery', { count: String(remaining) })
              : t('themes.previewFirst')}
          </span>
        </span>

        <ArrowRight className="relative h-4 w-4 shrink-0 text-brand transition-transform duration-200 group-hover:translate-x-1" />
      </Link>
    </div>
  );
};
