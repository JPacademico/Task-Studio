import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Languages } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { LOCALES, LOCALE_META, useLocaleStore, useT, type Locale } from '@/shared/i18n';

interface LanguageToggleProps {
  className?: string;
  /**
   * Draw the current language beside the icon.
   *
   * On the auth screens the control sits alone in a corner with nothing to
   * explain it, so it says what it is. In the account menu the surrounding
   * rows already carry labels and a second one would just be noise.
   */
  withLabel?: boolean;
}

/**
 * Picking the interface language.
 *
 * A popover rather than a cycling button, which is what the theme toggle next
 * to it uses. Two options today makes cycling tempting, but a language control
 * that changes the language *without saying to what* is a control you have to
 * click twice to understand — and the moment a third language exists, cycling
 * stops working entirely. The list also lets each language name itself, which
 * is the one bit of a language picker that must never be translated: somebody
 * looking for Portuguese is looking for the word "Português".
 */
export const LanguageToggle = ({ className, withLabel = false }: LanguageToggleProps) => {
  const t = useT();
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Escape closes it; the backdrop below handles pointer dismissal.
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const choose = (next: Locale) => {
    setLocale(next);
    setIsOpen(false);
  };

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={t('lang.change')}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          'flex h-9 items-center gap-1.5 rounded-xl px-2 text-content-muted',
          'transition-colors hover:bg-surface-sunken hover:text-content',
          withLabel ? 'min-w-[3.75rem] justify-center' : 'w-9 justify-center',
        )}
      >
        <Languages className="h-4 w-4 shrink-0" />
        {withLabel && (
          <span className="text-xs font-semibold uppercase tracking-wide">
            {locale === 'pt-BR' ? 'PT' : 'EN'}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Same dismissal pattern as the account menu and the bell. */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.ul
              role="listbox"
              aria-label={t('lang.label')}
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="panel absolute right-0 top-11 z-50 w-48 overflow-hidden p-1.5"
            >
              {LOCALES.map((option) => {
                const meta = LOCALE_META[option];
                const isActive = option === locale;

                return (
                  <li key={option}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => choose(option)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs',
                        'transition-colors hover:bg-surface-sunken',
                        isActive ? 'font-semibold text-content' : 'text-content-muted',
                      )}
                    >
                      <span aria-hidden className="text-sm leading-none">
                        {meta.flag}
                      </span>
                      {/* Never translated — see the note above. */}
                      <span className="flex-1">{meta.native}</span>
                      {isActive && <Check className="h-3.5 w-3.5 shrink-0 text-brand" />}
                    </button>
                  </li>
                );
              })}
            </motion.ul>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
