import type { MouseEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import { BookText } from 'lucide-react';

import { LanguageToggle } from '@/features/language-toggle/ui/language-toggle';
import { ThemeToggle } from '@/features/theme-toggle/ui/theme-toggle';
import { cn } from '@/shared/lib/cn';
import { buttonClasses, ScrollProgress, StudioMark } from '@/shared/ui';
import { useT } from '@/shared/i18n';
import { COLUMN } from './columns';
import { LavaLink } from './lava-link';

/** The bar across the top. */
export const LandingNav = () => {
  const t = useT();
  const { pathname } = useLocation();
  const reduceMotion = useReducedMotion();

  // Whether the three section links can be plain anchors. They could not before, and that was a
  // broken control rather than a cosmetic one: this bar is shared with the documentation page.
  const isOnLanding = pathname === '/welcome';

  return (
    <header
      // Swaps palette at once and the light/dark wave starts under it. See `theme-wave.ts`.
      data-theme-header
      className="sticky top-0 z-40 border-b border-edge/70 bg-surface/80 backdrop-blur"
    >
      {/* How far down the page you are, on the header's own bottom edge. Here rather than on
          the `main` of either page. */}
      <ScrollProgress />
      {/* The first thing in the tab order, and invisible until it is reached. A sticky bar with
          a logo, three anchors. */}
      <a
        href="#content"
        /* Parked above the viewport, not `sr-only`. `sr-only` + `buttonClasses` shipped a visible
           bug: `sr-only` collapses the box to 1×1 and sets `padding: 0`. */
        className={cn(
          buttonClasses({ size: 'sm' }),
          'absolute left-4 top-3 z-50 -translate-y-[calc(100%+1.5rem)]',
          'transition-transform duration-150 ease-studio focus:translate-y-0',
        )}
      >
        {t('landing.nav.skip')}
      </a>

      {/* The same column as the sections under it, so the brand and the last
          link line up with the page's edges at every width. See `columns`. */}
      <nav className={cn('mx-auto flex w-full items-center gap-3 px-4 py-3 sm:px-6', COLUMN)}>
        {/* The wordmark, which on this page is a "back to the top" control. */}
        <Link
          to="/welcome"
          onClick={(event) => scrollToTop(event, isOnLanding, reduceMotion)}
          aria-label={t('landing.nav.home')}
          className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
        >
          <span className="grid h-9 w-9 place-items-center text-brand">
            <StudioMark className="h-9 w-9" />
          </span>
          {/* The name in the skin's own handwriting. It was set in the interface typeface at
              14px bold — which is to say it was drawn exactly like every label. */}
          <span className="font-hand text-base font-bold tracking-normal">Task Studio</span>
        </Link>

        {/* Hidden below `md`, and deliberately not replaced by a hamburger. The links are
            anchors to sections of the very page somebody is already scrolling. */}
        <ul className="ml-4 hidden items-center gap-1 md:flex">
          {(
            [
              // Page order, so the bar is a map of the page rather than a menu with its own opinion
              // about it. Connections sits directly under the introduction now.
              ['#connects', 'landing.nav.connects'],
              ['#how', 'landing.nav.how'],
              ['#inside', 'landing.nav.inside'],
              ['#themes', 'landing.nav.themes'],
              // Last, because the section is: a price is only a question once
              // somebody wants the thing. See the note on the section itself.
              ['#pricing', 'landing.nav.pricing'],
            ] as const
          ).map(([href, label]) => {
            const linkClass = cn(
              'rounded-lg px-2.5 py-1.5 text-xs font-medium text-content-muted',
              'transition-colors hover:bg-surface-sunken hover:text-content',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
              'focus-visible:outline-brand',
            );

            return (
              <li key={href}>
                {isOnLanding ? (
                  <a
                    href={href}
                    onClick={(event) => scrollToSection(event, href, reduceMotion)}
                    className={linkClass}
                  >
                    {t(label)}
                  </a>
                ) : (
                  <Link to={`/welcome${href}`} className={linkClass}>
                    {t(label)}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Docs sits with the toggles rather than in the list on the left, and that is a
              distinction worth keeping. */}
          <Link
            to="/docs"
            aria-label={t('landing.nav.docs')}
            className={buttonClasses({ variant: 'ghost', size: 'sm', className: 'px-2 sm:px-3' })}
          >
            <BookText aria-hidden className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('landing.nav.docs')}</span>
          </Link>

          {/* The language picker, which was on this bar and invisible on it. */}
          <LanguageToggle withLabel className="hidden min-[400px]:block" />
          <ThemeToggle />

          {/* Real anchors wearing the button's clothes — see `buttonClasses`. */}
          <Link
            to="/login"
            className={buttonClasses({
              variant: 'ghost',
              size: 'sm',
              className: 'hidden sm:inline-flex',
            })}
          >
            {t('landing.nav.signIn')}
          </Link>
          <LavaLink to="/signup" size="sm">
            {t('landing.nav.getStarted')}
          </LavaLink>
        </div>
      </nav>
    </header>
  );
};


/** Back to the start of the page, rather than to the page you are on. */
const scrollToTop = (
  event: MouseEvent<HTMLAnchorElement>,
  isOnLanding: boolean,
  reduceMotion: boolean | null,
): void => {
  // Off the landing page the link is a genuine navigation. Leave it alone, and
  // leave modified clicks alone everywhere — those are a request for a new tab.
  if (!isOnLanding) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
    return;
  }

  event.preventDefault();
  window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });

  // Focus follows the scroll, or only the pointer went anywhere. Without this the caret stays on
  // the wordmark and the next Tab continues from the navigation bar.
  document.getElementById('content')?.focus({ preventScroll: true });

  window.history.replaceState(null, '', window.location.pathname + window.location.search);
};

/**
 * Travel to a section instead of teleporting to it.
 */
const scrollToSection = (
  event: MouseEvent<HTMLAnchorElement>,
  href: string,
  reduceMotion: boolean | null,
): void => {
  // Modified clicks are the reader asking for a new tab or window. Leave them
  // entirely alone.
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
    return;
  }

  const target = document.getElementById(href.slice(1));
  if (!target) return;

  event.preventDefault();
  target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  window.history.replaceState(null, '', href);
};
