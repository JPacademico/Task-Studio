import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Github, Instagram } from 'lucide-react';

import { wakeApi } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { buttonClasses, StudioMark } from '@/shared/ui';
import { useT } from '@/shared/i18n';
import { FeatureCarousel } from './ui/feature-carousel';
import { FeatureNotes } from './ui/feature-notes';
import { IntegrationsStrip } from './ui/integrations-strip';
import { LandingNav } from './ui/landing-nav';
import { Reveal } from './ui/reveal';
import { RotatingWord } from './ui/rotating-word';
import { ThemeShowcase } from './ui/theme-showcase';

/** Where the author's link goes. */
const AUTHOR_URL = 'https://www.instagram.com/pitic0_';

/**
 * The front door.
 *
 * ## Why this exists at all
 *
 * Because the root address used to answer a stranger with a password field.
 * That is the app assuming a relationship it has not got: somebody who has
 * just heard about the product and typed the address in has no account, no
 * reason to make one yet, and no way to find out what they would be signing up
 * for. `ProtectedRoute` sends a guest here now, and a signed-in visitor goes
 * straight to their dashboard — so the same URL means "my work" to a user and
 * "what is this" to a visitor, which is the only arrangement that serves both.
 *
 * ## Why the demos are built rather than filmed
 *
 * The loops below are the page's whole argument, and every one of them is
 * assembled from the app's own components and design tokens rather than being a
 * screen recording. The reasoning is set out in full on `DemoFrame`; the short
 * version is that a video would be several megabytes off a free tier, frozen in
 * one of thirteen skins, and stale the day a button moved.
 *
 * ## Why there is no pricing, no testimonials and no logo wall
 *
 * There is no pricing to state, nobody has said anything quotable yet, and the
 * only logos that could honestly appear are of things the product *connects
 * to* — which is what the connections belt is. Every one of those sections
 * exists on the pages this was modelled on and every one of them would be
 * furniture here. The page says what the thing is, shows it working, lists
 * what it plugs into, shows what it can look like, and asks. That is the whole
 * of it.
 */
const LandingPage = () => {
  const t = useT();
  const reduceMotion = useReducedMotion();
  const { hash } = useLocation();

  /*
   * Start the API waking up the moment somebody lands.
   *
   * The same call `AuthShell` makes, and it earns its place here more than it
   * does there: this page is the *first* thing a new visitor sees, they will
   * spend at least a few seconds reading before pressing anything, and those
   * are exactly the seconds a sleeping free-tier container needs to start. By
   * the time they reach the sign-up form it has answered.
   *
   * A no-op when the container has responded recently. See `wakeApi`.
   */
  useEffect(wakeApi, []);

  /*
   * Arriving with a section already named.
   *
   * The navigation bar is shared with the documentation page, where the section
   * links cannot be plain anchors — `#how` there means "a section of /docs",
   * which does not exist, so all three did nothing at all. They are router
   * links to `/welcome#how` off this page, and this is the other half of that:
   * React Router restores neither scroll position nor hash target on a
   * client-side navigation, so without this the reader lands at the top of the
   * page having asked for the middle of it.
   *
   * Deferred by a task rather than called straight from the effect, because
   * the section being scrolled to is inside a lazily-loaded route that has only
   * just mounted: the element exists, but the images and the panels around it
   * are still settling, and a scroll measured against an unsettled layout lands
   * short of the heading it was aiming at.
   *
   * `setTimeout` rather than `requestAnimationFrame`, which reads as the more
   * correct tool and is not: a frame callback does not fire at all while the
   * document is hidden, so a link opened into a background tab would restore
   * the reader to the top of the page rather than to the section they asked
   * for. A task fires either way, and `scrollIntoView` flushes layout itself.
   */
  useEffect(() => {
    if (!hash) return;

    const id = hash.slice(1);
    const timer = window.setTimeout(() => {
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [hash, reduceMotion]);

  return (
    <div className="min-h-dvh bg-surface">
      <LandingNav />

      {/*
        A `main` landmark, which the page did not have.

        It is what the skip link above lands in, and it is what a screen
        reader's "jump to main content" offers — on a page that is otherwise
        eleven sections with no boundary between the navigation and the
        argument. `tabIndex={-1}` makes it a valid focus target for the anchor
        without putting it in the tab order.
      */}
      <main id="content" tabIndex={-1} className="focus:outline-none">
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden">
        {/*
          A wash behind the headline rather than a hard band.

          The page is meant to read as paper on a desk, and a full-bleed
          coloured hero would be the one rectangle on it that is obviously a
          website. This is a soft radial tint in the brand accent — present
          enough to lift the type off the surface, faint enough that the
          thirteen skins each get their own version of it for free.
        */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgb(var(--brand)/0.14),transparent_70%)]"
        />

        <div className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20">
          {/*
            No pill above the headline.

            It read "Boards, notes, meetings and docs — in one place", which is
            the sentence under the headline said first, worse, and in 11px. The
            first thing on the page is now the thing the page is about.
          */}
          <motion.h1
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="max-w-4xl text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
          >
            {t('landing.hero.titleLead')} <RotatingWord />
            <br className="hidden sm:block" />
            <span className="text-content-muted">{t('landing.hero.titleTail')}</span>
          </motion.h1>

          {/*
            The paragraph and the buttons on one line, not stacked.

            Headline, then paragraph, then buttons is three full-width rows for
            about forty words, and on a laptop it pushed the first demo entirely
            below the fold — so the page's opening screen was type and nothing
            else. Side by side, the same content ends a third of a screen
            higher and the reader meets the product rather than a wall of
            introduction.

            `items-end` rather than `items-center`: the buttons align to the
            paragraph's last line, so the two blocks share a baseline instead of
            floating against each other. Stacked below `sm`, where there is no
            width to put them side by side and the vertical order is the reading
            order anyway.

            There is nothing under them. A line of reassurance used to sit there
            — "No card. Bring a GitHub repository…" — and both halves of it were
            already said better elsewhere: there is no pricing on this page for
            a card to be relevant to, and the import demo *shows* a repository
            becoming a project rather than promising it.
          */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12 }}
            className="mt-6 flex flex-col gap-6 sm:mt-8 sm:flex-row sm:items-end sm:justify-between sm:gap-10"
          >
            <p className="max-w-xl text-base leading-relaxed text-content-muted sm:text-lg">
              {t('landing.hero.body')}
            </p>

            <div className="flex shrink-0 flex-wrap items-center gap-2.5">
              <Link
                to="/signup"
                className={buttonClasses({ size: 'lg', className: 'gap-2' })}
              >
                {t('landing.hero.primary')}
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
              <a href="#how" className={buttonClasses({ variant: 'secondary', size: 'lg' })}>
                {t('landing.hero.secondary')}
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================= CONNECTIONS =================

          Second on the page now, and with neither a heading nor a paragraph.

          Both were removed for the same reason and the move follows from it.
          "It plugs into what you already use" is a sentence the belt underneath
          says better and instantly — eight marks a reader recognises before
          they have finished the heading — and the paragraph under it ("nothing
          here needs an account manager") was answering an objection nobody has
          yet formed two screens into a page with no pricing on it.

          Stripped of the words, it stops being a section that has to be *read*
          and becomes a band that is simply *seen*, which is the only thing it
          was ever going to be at this speed. That is what makes it work
          directly under the introduction, where it costs no vertical space
          worth the name and answers the first question a stranger actually has
          — "does this work with my stuff?" — before the product has to argue
          anything.

          Full-bleed, outside the page's column. A marquee that stops at the
          same margin as the copy above it is a marquee in a box; edge to edge
          it reads as something passing through. The fade at each end is on the
          strip itself. */}
      <section
        id="connects"
        aria-label={t('landing.nav.connects')}
        className="scroll-mt-20 border-t border-edge/70 py-10 sm:py-14"
      >
        <Reveal>
          <IntegrationsStrip />
        </Reveal>
      </section>

      {/* ================= THE DEMOS =================

          No heading over this one, deliberately.

          It used to carry "Three things, actually working" and a sentence
          explaining that the panels below were real interfaces rather than
          screenshots. Both were redundant against the thing underneath them:
          nine live, moving, themed interfaces are self-evidently not
          screenshots, and a reader who needs to be told that has not looked at
          them yet. The section is now the demos, which is what it was always
          for. */}
      <section
        id="how"
        aria-label={t('landing.nav.how')}
        className="scroll-mt-20 border-t border-edge/70 bg-surface-sunken/30"
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <Reveal>
            <FeatureCarousel />
          </Reveal>
        </div>
      </section>

      {/* ================= WHAT IS INSIDE ================= */}
      <section
        id="inside"
        className="scroll-mt-20 border-t border-edge/70 bg-surface-sunken/30"
      >
        {/* The heading is inside the board now — pinned to the middle of it,
            with the six notes arranged around it. A heading above a wall and a
            heading *on* the wall are different claims, and this section is
            making the second one.

            `max-w-7xl` rather than the `max-w-6xl` every other section uses,
            and it is the one place on the page that earns the exception: the
            board *is* the section, so every pixel of column it does not use is
            a pixel of empty wall around a wall. See `FeatureNotes`. */}
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <Reveal>
            <FeatureNotes />
          </Reveal>
        </div>
      </section>

      {/* ================= THEMES =================

          Last of the four, and deliberately so. It is the most immediately
          impressive thing on the page and the least useful thing to lead with:
          somebody who does not yet know what the product *is* has no reason to
          care what it can look like. By this point they have watched it work,
          seen what it plugs into and read what is in it — and this is the
          answer to the question that follows all three, which is what it would
          be like to live in. */}
      <section
        id="themes"
        className="scroll-mt-20 border-t border-edge/70"
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          {/*
            A heading and nothing else.

            The paragraph under this explained that a skin reinterprets the whole
            app rather than recolouring it — which is precisely what the barrel,
            the description panel and the light-against-dark box below
            demonstrate, in the reader's own eyes, thirteen times over. A
            sentence claiming what the thing under it is about to show is a
            sentence that only delays the showing.
          */}
          <Reveal>
            <header className="max-w-2xl">
              <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                {t('landing.themes.title')}
              </h2>
            </header>
          </Reveal>

          <Reveal className="mt-10" delay={80}>
            <ThemeShowcase />
          </Reveal>
        </div>
      </section>

      {/* ================= CLOSING ================= */}
      <section className="border-t border-edge/70 bg-surface-sunken/30">
        <div className="mx-auto w-full max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <Reveal>
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand/15 text-brand ring-1 ring-inset ring-brand/25">
            <StudioMark className="h-9 w-9" />
          </span>

          <h2 className="mt-6 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            {t('landing.cta.title')}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-content-muted">
            {t('landing.cta.body')}
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-2.5">
            <Link to="/signup" className={buttonClasses({ size: 'lg', className: 'gap-2' })}>
              {t('landing.cta.primary')}
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className={buttonClasses({ variant: 'secondary', size: 'lg' })}
            >
              {t('landing.cta.secondary')}
            </Link>
          </div>
          </Reveal>
        </div>
      </section>

      </main>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-edge/70 bg-surface-sunken/40">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-8 sm:px-6">
          <span className="inline-flex items-center gap-2 text-xs font-semibold">
            <StudioMark className="h-5 w-5 text-brand" />
            Task Studio
          </span>

          <p className="text-2xs text-content-faint">{t('landing.footer.tagline')}</p>

          <AuthorCredit />

          <a
            /*
             * The repository, not github.com.
             *
             * This said "Source" and went to GitHub's own homepage — a link
             * that looks like proof the project is open and, followed, proves
             * only that GitHub exists. It is the same repository the CLI's
             * documentation link points into.
             */
            href="https://github.com/JPacademico/Task-Studio"
            target="_blank"
            // `noopener` is the one that matters — without it the opened page
            // gets a handle on this one through `window.opener`.
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 text-2xs text-content-muted transition-colors hover:text-content"
          >
            <Github aria-hidden className="h-3.5 w-3.5" />
            {t('landing.footer.source')}
          </a>
        </div>
      </footer>
    </div>
  );
};

/**
 * Who made it.
 *
 * ## Why it is a tooltip and not just a link
 *
 * Because "by Pitico" on its own is a name with no destination visible, and a
 * name in brand colour that turns out to be a link to somewhere unstated is the
 * pattern people have learned to distrust. The tooltip says where it goes
 * before it is followed — which is the whole job of one, and the reason this is
 * a small labelled card rather than a `title` attribute: `title` takes a second
 * to appear, cannot be styled to match thirteen skins, and never appears at all
 * on touch or for a keyboard user.
 *
 * ## Why it is CSS rather than a component
 *
 * There is no tooltip primitive in `shared/ui` and one credit line is not the
 * brief that should produce one — a general tooltip has to solve placement,
 * collision, portals and dismissal, none of which this needs. `group-hover`
 * and `group-focus-within` on a fixed position above a fixed-width card is
 * eight declarations, and it works for the pointer and the keyboard equally.
 *
 * `aria-describedby` is deliberately absent: the tooltip's text is already the
 * link's accessible description via `aria-label`, and pointing at it as well
 * would make a screen reader read the destination twice.
 */
const AuthorCredit = () => {
  const t = useT();

  return (
    <span className="group relative ml-auto inline-flex items-center gap-1 text-2xs text-content-faint">
      {t('landing.footer.by')}{' '}
      <a
        href={AUTHOR_URL}
        target="_blank"
        rel="noreferrer noopener"
        aria-label={`Pitico — ${t('landing.footer.byWho')}`}
        className={cn(
          'inline-flex items-center gap-1 rounded font-semibold text-brand',
          'underline decoration-brand/40 decoration-dotted underline-offset-[3px]',
          'transition-colors hover:decoration-brand',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
          'focus-visible:outline-brand',
        )}
      >
        <Instagram aria-hidden className="h-3 w-3" />
        Pitico
      </a>

      {/*
        The card. Parked above the line, revealed on hover or on focus reaching
        anything inside the group — which on this element is the link itself, so
        a keyboard user tabbing to it gets the same explanation a pointer user
        gets.

        `pointer-events-none` matters: without it the card appears under the
        pointer travelling towards the link and swallows the click.
      */}
      <span
        /*
         * `aria-hidden`, not `role="tooltip"`.
         *
         * The card says exactly what the link's `aria-label` already says, so
         * exposing it as well makes a screen reader announce the destination
         * twice — once as the name of the thing being focused and once as a
         * loose paragraph next to it. It is a *visual* affordance for people
         * who cannot hear an accessible name, and marking it as anything else
         * is the accessibility equivalent of alt text on a decorative border.
         */
        aria-hidden
        className={cn(
          'pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2',
          'whitespace-nowrap rounded-lg border border-edge bg-surface-raised px-2.5 py-1.5',
          'text-2xs font-medium text-content shadow-lg',
          'opacity-0 transition-all duration-150 ease-studio',
          'translate-y-1 group-hover:translate-y-0 group-hover:opacity-100',
          'group-focus-within:translate-y-0 group-focus-within:opacity-100',
        )}
      >
        {t('landing.footer.byWho')}
        {/* The nib, rotated out of the card's own bottom edge, so the tooltip
            points at the name rather than floating over it. */}
        <span
          aria-hidden
          className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-edge bg-surface-raised"
        />
      </span>
    </span>
  );
};

export default LandingPage;
