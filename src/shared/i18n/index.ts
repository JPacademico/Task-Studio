import { useCallback } from 'react';
import { create } from 'zustand';

import { STORAGE_KEYS } from '@/shared/config/constants';
import { DICTIONARIES, LOCALES, type Locale, type TranslationKey } from './locales';

export { LOCALES, LOCALE_META, type Locale, type TranslationKey } from './locales';

/**
 * Which language the app is in, and how a component asks for a string. Language lives in
 * `localStorage`, not on the `User` row.
 */

/** The first supported language the browser asks for, else English. */
const detectLocale = (): Locale => {
  const stored = (() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.locale);
    } catch {
      return null;
    }
  })();

  if (stored && (LOCALES as readonly string[]).includes(stored)) return stored as Locale;

  // `languages` is ordered by the user's own preference, so the first match is the best one — not
  // merely a match.
  for (const tag of navigator.languages ?? [navigator.language]) {
    const lower = tag.toLowerCase();
    if (lower.startsWith('pt')) return 'pt-BR';
    if (lower.startsWith('en')) return 'en';
  }

  return 'en';
};

/**
 * Keeps `<html lang>` honest. Not decoration: it is what a screen reader uses to pick a voice, what
 * the browser uses to offer a translation, and what `:lang()` and hyphenation rules key off.
 */
const syncDocumentLang = (locale: Locale): void => {
  document.documentElement.lang = locale;
};

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>((set) => {
  const initial = detectLocale();
  syncDocumentLang(initial);

  return {
    locale: initial,
    setLocale: (locale) => {
      try {
        localStorage.setItem(STORAGE_KEYS.locale, locale);
      } catch {
        /* private mode — the choice holds for this session only */
      }
      syncDocumentLang(locale);
      set({ locale });
    },
  };
});

/** Just the active language, for components that switch on it. */
export const useLocale = (): Locale => useLocaleStore((state) => state.locale);

/**
 * The active language, outside React. Same reasoning as `translate`: a plain function called during
 * render reads the same value a hook would.
 */
export const getLocale = (): Locale => useLocaleStore.getState().locale;

export type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string;

const substitute = (
  template: string,
  vars?: Record<string, string | number>,
): string =>
  vars
    ? Object.entries(vars).reduce(
        (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
        template,
      )
    : template;

/**
 * Translation outside a React component. Reads the store imperatively, so it does **not** re-render
 * anything when the language changes.
 */
export const translate: Translate = (key, vars) =>
  substitute(DICTIONARIES[useLocaleStore.getState().locale][key] ?? key, vars);

/**
 * The translation function, bound to the active language. Memoised on the locale so a component
 * that passes `t` into a `useMemo` or an effect does not re-run on every render of its parent.
 */
export const useT = (): Translate => {
  const locale = useLocale();

  return useCallback(
    (key, vars) => substitute(DICTIONARIES[locale][key] ?? key, vars),
    [locale],
  );
};
