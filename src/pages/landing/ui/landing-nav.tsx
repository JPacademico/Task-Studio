import { Link } from 'react-router-dom';

import { LanguageToggle } from '@/features/language-toggle/ui/language-toggle';
import { ThemeToggle } from '@/features/theme-toggle/ui/theme-toggle';
import { cn } from '@/shared/lib/cn';
import { buttonClasses, StudioMark } from '@/shared/ui';
import { useT } from '@/shared/i18n';

/**
 * The bar across the top.
 *
 * ## Why there are three links and not seven
 *
 * Because there are three things on the page. A landing page whose navigation
 * offers Pricing, Solutions, Resources and Customers when it has none of those
 * is a page that has copied a template, and every one of those links is a dead
 * end somebody has to discover for themselves. What is here maps exactly to
 * what is below it.
 *
 * ## Why the language and theme toggles are on a marketing page
 *
 * They are on every unauthenticated screen already — see `AuthShell` — and
 * both earn their place here for the same reason they do there. The app ships
 * in two languages, and somebody who reads Portuguese should not have to sign
 * up in English to find that out. The theme toggle is doing something else
 * too: the page is drawn in the reader's own palette, so switching it is the
 * fastest possible demonstration that the whole product is.
 */
export const LandingNav = () => {
  const t = useT();

  return (
    <header className="sticky top-0 z-40 border-b border-edge/70 bg-surface/80 backdrop-blur">
      {/*
        The first thing in the tab order, and invisible until it is reached.

        A sticky bar with a logo, three anchors, two toggles and two buttons is
        eight stops between the top of the page and its first word. For anybody
        navigating by keyboard that is eight stops paid on every arrival; this
        is one, and it goes straight to the content.
      */}
      <a
        href="#content"
        className={cn(
          'sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50',
          buttonClasses({ size: 'sm' }),
        )}
      >
        {t('landing.nav.skip')}
      </a>

      <nav className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link
          to="/welcome"
          className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/15 text-brand ring-1 ring-inset ring-brand/25">
            <StudioMark className="h-6 w-6" />
          </span>
          <span className="text-sm font-bold tracking-tight">Task Studio</span>
        </Link>

        {/*
          Hidden below `md`, and deliberately not replaced by a hamburger. The
          links are anchors to sections of the very page somebody is already
          scrolling; a menu that opens a sheet to offer "scroll down a bit" is
          ceremony. On a phone the page *is* the navigation.
        */}
        <ul className="ml-4 hidden items-center gap-1 md:flex">
          {(
            [
              ['#how', 'landing.nav.how'],
              ['#connects', 'landing.nav.connects'],
              ['#inside', 'landing.nav.inside'],
            ] as const
          ).map(([href, label]) => (
            <li key={href}>
              <a
                href={href}
                className={cn(
                  'rounded-lg px-2.5 py-1.5 text-xs font-medium text-content-muted',
                  'transition-colors hover:bg-surface-sunken hover:text-content',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                  'focus-visible:outline-brand',
                )}
              >
                {t(label)}
              </a>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-1.5">
          <LanguageToggle />
          <ThemeToggle />

          {/* Real anchors wearing the button's clothes — see `buttonClasses`.
              Sign in stays quiet and Get started does not: somebody who
              already has an account knows where to look, and somebody who
              does not is the person this page is for. */}
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
          <Link to="/signup" className={buttonClasses({ size: 'sm' })}>
            {t('landing.nav.getStarted')}
          </Link>
        </div>
      </nav>
    </header>
  );
};
