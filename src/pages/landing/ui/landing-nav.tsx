import type { MouseEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import { BookText } from 'lucide-react';

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
  const { pathname } = useLocation();
  const reduceMotion = useReducedMotion();

  /*
   * Whether the three section links can be plain anchors.
   *
   * They could not before, and that was a broken control rather than a cosmetic
   * one: this bar is shared with the documentation page, where `href="#how"`
   * resolves to `/docs#how` — an anchor to a section that does not exist on
   * that document. Pressing any of the three did nothing at all, silently,
   * which is the worst way for a link to fail.
   *
   * On the landing page itself they stay native anchors, because the browser's
   * own same-document scrolling is smoother than anything a router can do and
   * it honours `scroll-behavior` and `prefers-reduced-motion` for free.
   * Anywhere else they become router links carrying the hash, and `LandingPage`
   * scrolls to it on arrival — see the effect there.
   */
  const isOnLanding = pathname === '/welcome';

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
        /*
         * Parked above the viewport, not `sr-only`.
         *
         * `sr-only` + `buttonClasses` shipped a visible bug: `sr-only` collapses
         * the box to 1×1 and sets `padding: 0`, and the button classes that
         * follow it re-apply `px-3 py-1.5`, `bg-brand` and `rounded-xl`. Tailwind's
         * merge does not treat those as conflicting — they are different
         * property groups — so both survived and the result was a one-pixel
         * brand-coloured rounded box, permanently visible in the top-left corner
         * of the page, that did nothing when clicked.
         *
         * Translating a normally-sized button out of view has none of that
         * fragility: nothing about the class list is load-bearing, the element
         * keeps its real dimensions, and sliding it back in on focus is one
         * transform on the compositor.
         */
        className={cn(
          buttonClasses({ size: 'sm' }),
          'absolute left-4 top-3 z-50 -translate-y-[calc(100%+1.5rem)]',
          'transition-transform duration-150 ease-studio focus:translate-y-0',
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
          {/*
            The name in the skin's own handwriting.

            It was set in the interface typeface at 14px bold — which is to say
            it was drawn exactly like every label, button and menu item beside
            it, and read as one. A product whose whole argument is that it
            behaves like paper had a wordmark that looked like a system font.

            `font-hand` is the same variable the Post-its use, so the name is
            written in whatever hand the active skin writes in: a marker on
            Paper, a monospace on Terminal, a carved serif on Runic. It changes
            with the theme rather than fighting it, which is what a wordmark
            built out of design tokens buys that an image never could.

            Slightly larger and with the tracking released, because a script
            face set at a UI size with tight letter-spacing is a smudge.
          */}
          <span className="font-hand text-base font-bold tracking-normal">Task Studio</span>
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
              // Page order, so the bar is a map of the page rather than a
              // menu with its own opinion about it. Connections sits directly
              // under the introduction now.
              ['#connects', 'landing.nav.connects'],
              ['#how', 'landing.nav.how'],
              ['#inside', 'landing.nav.inside'],
              ['#themes', 'landing.nav.themes'],
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
          {/*
            Docs sits with the toggles rather than in the list on the left, and
            that is a distinction worth keeping: everything on the left is an
            anchor to a section of *this* page, and this is a route to another
            one. Mixing them would make one of the four behave differently from
            the other three for no visible reason.

            Visible at every width, unlike the anchors — on a phone the page is
            its own navigation, but the documentation still has to be reachable.
          */}
          <Link
            to="/docs"
            className={buttonClasses({ variant: 'ghost', size: 'sm' })}
          >
            <BookText aria-hidden className="h-3.5 w-3.5" />
            {t('landing.nav.docs')}
          </Link>

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


/**
 * Travel to a section instead of teleporting to it.
 *
 * ## Why this intercepts a link that already worked
 *
 * A bare `href="#how"` jumps: the page is one thing, then it is another, with
 * nothing in between. On a document made of five full-height sections that is
 * genuinely disorienting — the reader cannot tell whether they moved down two
 * screens or eight, so they lose their place and scroll back up to check.
 * Animating the trip is what turns "the page changed" into "I went somewhere",
 * and it costs a smooth scroll the browser performs off the main thread.
 *
 * ## Why not `scroll-behavior: smooth` in the stylesheet
 *
 * Because that declaration is global to the document, and it would silently
 * animate every *programmatic* scroll in the entire application as well — the
 * chat dock jumping to its newest message, a modal restoring scroll position,
 * the board scrolling a dragged card into view. Those are supposed to be
 * instant; making them glide is how a fast app starts feeling laggy. This is
 * the one place the animation is wanted, so this is the only place it is asked
 * for.
 *
 * ## Why the URL is still updated
 *
 * `preventDefault` stops the browser from writing the hash, and a section link
 * that leaves the address bar behind is one nobody can copy, bookmark or come
 * back to. `replaceState` puts it back without adding a history entry, so the
 * back button still leaves the page rather than walking the reader up through
 * every section they visited on the way down.
 *
 * A missing target falls through to the browser's own behaviour rather than
 * being swallowed: if the section is not on this page, the plain anchor is a
 * better answer than nothing happening.
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
