import { useCallback } from 'react';
import { create } from 'zustand';

import { STORAGE_KEYS } from '@/shared/config/constants';
import { DICTIONARIES, LOCALES, type Locale, type TranslationKey } from './locales';

export { LOCALES, LOCALE_META, type Locale, type TranslationKey } from './locales';

/**
 * Which language the app is in, and how a component asks for a string.
 *
 * ## Why the preference is local, not on the account
 *
 * Language lives in `localStorage`, not on the `User` row. Two reasons, and the
 * second is the real one:
 *
 *   1. It has to work on the sign-in screen, where there is no account yet. A
 *      server-stored preference cannot translate the page you are looking at
 *      *before* you log in, which is precisely where a language picker earns
 *      its place.
 *   2. It costs nothing. A column would mean a migration, a PATCH endpoint and
 *      a round trip on boot to find out what language to render in — on a
 *      free-tier API where boot latency is already the thing being fought.
 *
 * The trade is that the choice does not follow the user to another device.
 * That is a real limitation and the right one to accept here; moving it to the
 * account later is additive and does not change any call site.
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

  // `languages` is ordered by the user's own preference, so the first match is
  // the best one — not merely a match. `pt` on its own resolves to pt-BR: it is
  // the only Portuguese this app has, and a Portuguese speaker is far better
  // served by Brazilian Portuguese than by English.
  for (const tag of navigator.languages ?? [navigator.language]) {
    const lower = tag.toLowerCase();
    if (lower.startsWith('pt')) return 'pt-BR';
    if (lower.startsWith('en')) return 'en';
  }

  return 'en';
};

/**
 * Keeps `<html lang>` honest.
 *
 * Not decoration: it is what a screen reader uses to pick a voice, what the
 * browser uses to offer a translation, and what `:lang()` and hyphenation rules
 * key off. Getting the text right and leaving the attribute saying `en` is a
 * half-done job that only shows up in assistive tech.
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
 * The active language, outside React.
 *
 * Same reasoning as `translate`: a plain function called during render reads the
 * same value a hook would, and the formatters in `shared/lib/dates` need it to
 * pick a date-fns locale without every one of them taking a parameter.
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
 * Translation outside a React component.
 *
 * Reads the store imperatively, so it does **not** re-render anything when the
 * language changes. That makes it wrong for ordinary components — use `useT`
 * there — and right for the two places a hook cannot go: class components
 * (`RouteBoundary`) and module-level code such as mutation callbacks that fire
 * a toast long after their component stopped caring.
 *
 * Both of those render once, in response to an event, and read the language
 * that was active at that moment. A toast that keeps its original wording when
 * somebody switches language mid-flight is correct, not stale.
 */
export const translate: Translate = (key, vars) =>
  substitute(DICTIONARIES[useLocaleStore.getState().locale][key] ?? key, vars);

/**
 * The translation function, bound to the active language.
 *
 * Memoised on the locale so a component that passes `t` into a `useMemo` or an
 * effect does not re-run on every render of its parent.
 *
 * A missing key cannot happen — `TranslationKey` is derived from the English
 * dictionary and every locale is typed against it, so the compiler has already
 * checked what a runtime fallback would be guessing at. The `?? key` is there
 * only to keep the return type honest.
 */
export const useT = (): Translate => {
  const locale = useLocale();

  return useCallback(
    (key, vars) => substitute(DICTIONARIES[locale][key] ?? key, vars),
    [locale],
  );
};
