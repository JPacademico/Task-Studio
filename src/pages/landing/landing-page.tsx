import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Github, Instagram } from 'lucide-react';

import { wakeApi } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { useCanvasBudget, useCanvasPixelRatio } from '@/shared/lib/use-canvas-budget';
import { buttonClasses, RunicText, StudioMark } from '@/shared/ui';
import { useT } from '@/shared/i18n';
import { FeatureCarousel } from './ui/feature-carousel';
import { FeatureNotes } from './ui/feature-notes';
import { IntegrationsStrip } from './ui/integrations-strip';
import { LandingNav } from './ui/landing-nav';
import { LavaLink } from './ui/lava-link';
import { PiticoMark } from './ui/pitico-mark';
import { useSkin, useTheme } from '@/app/providers/theme-provider';
import { SkinAmbience } from './ui/skin-ambience';
import { PricingTable } from './ui/pricing-table';
import { Reveal } from './ui/reveal';
import { RotatingWord } from './ui/rotating-word';
import { ThemeShowcase } from './ui/theme-showcase';
import { COLUMN, COLUMN_NARROW, COLUMN_WIDE } from './ui/columns';

// The two WebGL surfaces on this page, split out of its chunk. `three`, `@react-three/fiber` and
// the shader library together outweigh everything else in the repository.
const HeroField = lazy(() => import('./ui/hero-field'));

/** Where the author's link goes. */
const AUTHOR_URL = 'https://www.instagram.com/pitic0_';

/** The front door. */
const LandingPage = () => {
  const t = useT();
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const { hash } = useLocation();
  // The theme the reader is actually wearing, for the closing section's ambience. `useSkin` rather
  // than the barrel's index in `ThemeShowcase`.
  const activeSkin = useSkin();

  // The introduction's 3D field, and the three questions it has to answer before it is allowed to
  // exist: is this machine up to it, has the reader asked for less motion.
  const heroScene = useRef<HTMLDivElement>(null);
  const canRenderHero = useCanvasBudget(heroScene);
  const heroPixelRatio = useCanvasPixelRatio(1.75);

  // Out of view the field is not torn down outright: it parks into `heroStill`, a plain 2D copy of
  // its last frame, so a fast scroll back meets the picture rather than an empty band.
  const heroStill = useRef<HTMLCanvasElement>(null);
  const [isHeroMounted, setIsHeroMounted] = useState(false);
  const parkHero = useCallback(() => setIsHeroMounted(false), []);
  const { isDark } = useTheme();

  useEffect(() => {
    if (canRenderHero) setIsHeroMounted(true);
  }, [canRenderHero]);

  // A still in yesterday's colours is worse than none: a skin or palette change drops it.
  useEffect(() => {
    const still = heroStill.current;
    if (!still || still.width === 0) return;
    still.width = 0;
    still.height = 0;
  }, [activeSkin, isDark]);

  // Start the API waking up the moment somebody lands. The same call `AuthShell` makes, and it
  // earns its place here more than it does there.
  useEffect(wakeApi, []);

  // Arriving with a section already named. The navigation bar is shared with the documentation
  // page, where the section links cannot be plain anchors.
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

      {/* A `main` landmark, which the page did not have. It is what the skip link above lands
          in, and it is what a screen reader's "jump to main content" offers. */}
      <main id="content" tabIndex={-1} className="focus:outline-none">
      {/* --- HERO ---
          Taller than it was, and the extra height is the point rather than a side effect. */}
      <section className="relative flex min-h-[76svh] items-center overflow-hidden">
        {/* A wash behind the headline rather than a hard band. The page is meant to read as
            paper on a desk. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background-image:var(--hero-wash)]"
        />

        {/* The room the introduction stands in. `pointer-events-none` on the host as well as on
            the canvas: everything in front of this is a link or a button. */}
        <div ref={heroScene} aria-hidden className="pointer-events-none absolute inset-0">
          <canvas ref={heroStill} width={0} height={0} className="absolute left-0 top-0" />
          {isHeroMounted && (
            <Suspense fallback={null}>
              <HeroField
                pixelRatio={heroPixelRatio}
                live={canRenderHero}
                still={heroStill}
                onParked={parkHero}
              />
            </Suspense>
          )}
        </div>

        {/* The type sits on a scrim, and the scrim is not decoration. The field behind it is
            translucent paper. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-surface/40 via-surface/15 to-surface/75"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(75%_60%_at_35%_45%,rgb(var(--surface)/0.62),transparent_75%)]"
        />

        <div className={cn('relative mx-auto w-full px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20', COLUMN)}>
          {/* No pill above the headline. It read "Boards, notes, meetings and docs — in one
              place", which is the sentence under the headline said first, worse, and in 11px. */}
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

          {/* The paragraph and the buttons on one line, not stacked. Headline, then paragraph,
              then buttons is three full-width rows for about forty words. */}
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
              {/* The lamp, not the flat brand fill. */}
              <LavaLink to="/signup" size="lg">
                {t('landing.hero.primary')}
                <ArrowRight aria-hidden className="h-4 w-4" />
              </LavaLink>
              <a href="#how" className={buttonClasses({ variant: 'secondary', size: 'lg' })}>
                {t('landing.hero.secondary')}
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* --- CONNECTIONS ---
          Second on the page now, and with neither a heading nor a paragraph. */}
      <section
        id="connects"
        aria-label={t('landing.nav.connects')}
        className="scroll-mt-20 border-t border-edge/70 py-10 sm:py-14"
      >
        <Reveal>
          <IntegrationsStrip />
        </Reveal>
      </section>

      {/* --- THE DEMOS --- */}
      <section
        id="how"
        aria-label={t('landing.nav.how')}
        /* `overflow-x-clip` is the companion to the carousel's full-bleed arrow layer. That layer
           is `w-screen` — 100vw — and `vw` counts the scrollbar. */
        className="scroll-mt-20 overflow-x-clip border-t border-edge/70 bg-surface-raised/40"
      >
        <div className={cn('mx-auto w-full px-4 py-16 sm:px-6 sm:py-24', COLUMN)}>
          <Reveal>
            <FeatureCarousel />
          </Reveal>
        </div>
      </section>

      {/* ================= WHAT IS INSIDE ================= */}
      <section
        id="inside"
        className="scroll-mt-20 border-t border-edge/70 bg-surface-raised/40"
      >
        {/* The heading is inside the board now — pinned to the middle of it, with the six notes
            arranged around it. */}
        <div className={cn('mx-auto w-full px-4 py-16 sm:px-6 sm:py-24', COLUMN_WIDE)}>
          <Reveal>
            <FeatureNotes />
          </Reveal>
        </div>
      </section>

      {/* --- THEMES ---
          Last of the four, and deliberately so. */}
      <section
        id="themes"
        className="scroll-mt-20 border-t border-edge/70"
      >
        <div className={cn('mx-auto w-full px-4 py-16 sm:px-6 sm:py-24', COLUMN)}>
          {/* A heading and nothing else. */}
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

      {/* --- PRICING ---
          Last of the content sections, and directly before the closing. */}
      <section id="pricing" className="scroll-mt-20 border-t border-edge/70">
        <div className={cn('mx-auto w-full px-4 py-16 sm:px-6 sm:py-24', COLUMN)}>
          <Reveal>
            <header className="mx-auto max-w-2xl text-center">
              <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                {t('landing.pricing.title')}
              </h2>
              <p className="mt-3 text-balance text-base leading-relaxed text-content-muted">
                {t('landing.pricing.subtitle')}
              </p>
            </header>
          </Reveal>

          <Reveal className="mt-10" delay={80}>
            <PricingTable />
          </Reveal>
        </div>
      </section>

      {/* --- CLOSING ---
          The last thing on the page is who made it, not a second sign-up form. */}
      <section className="relative overflow-hidden border-t border-edge/70 bg-surface-raised/40">
        {/* The applied theme's own weather, across the closing band. */}
        {/* `span`: the band is about three times as wide as it is tall, so the runes and eyes. */}
        <SkinAmbience skin={activeSkin} density={0.55} span={3} className="z-0" />

        <div className="relative z-10 mx-auto w-full max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <Reveal>
          <span className="mx-auto grid h-14 w-14 place-items-center text-brand">
            <StudioMark className="h-14 w-14" />
          </span>

          {/* The mark is set in the heading rather than beside it. */}
          <h2 className="mt-6 flex flex-wrap items-baseline justify-center gap-x-2 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            <span>{t('landing.pitico.before')}</span>
            <PiticoMark />
            {t('landing.pitico.after') && (
              <span>{t('landing.pitico.after')}</span>
            )}
          </h2>

          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-content-muted">
            {t('landing.pitico.body')}
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-2.5">
            <LavaLink to="/signup" size="lg">
              {t('landing.cta.primary')}
              <ArrowRight aria-hidden className="h-4 w-4" />
            </LavaLink>
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
      {/* A desk, not a bar. */}
      <footer className="relative border-t border-edge/70 bg-surface-raised/50 pb-16 pt-14">
        <div className={cn('mx-auto w-full px-4 pb-32 sm:px-6', COLUMN)}>
          <div className="flex flex-col gap-10 md:flex-row md:justify-between">
            {/* ---------- Left: the invitation ---------- */}
            <div className="flex-1 space-y-7">
              <div>
                <h2 className="font-display text-5xl font-bold leading-none tracking-tighter text-brand sm:text-6xl">
                  {t('landing.footer.talk')}
                </h2>
                <p className="mt-2 origin-bottom-left -rotate-1 font-hand text-xl text-content-muted">
                  {t('landing.footer.coffee')}
                </p>
              </div>

              <div className="flex flex-col gap-1 text-sm">
                <span className="font-semibold text-content">{t('landing.footer.openSource')}</span>
                <a
                  href="https://github.com/JPacademico/Task-Studio"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex w-fit items-center gap-1.5 text-content-muted transition-colors hover:text-brand"
                >
                  <Github aria-hidden className="h-3.5 w-3.5" />
                  github.com/JPacademico/Task-Studio
                </a>
                <span className="text-content-faint">{t('landing.footer.tagline')}</span>
              </div>
            </div>

            {/* ---------- Right: the funnel, the map, the small print ---------- */}
            <div className="flex flex-1 flex-col items-start justify-between gap-7 md:items-end">
              {/* The reference's newsletter line, carrying the real funnel. A `form` with a
                  `GET`-shaped submit rather than an input and a button wired to an onClick. */}
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const address = new FormData(event.currentTarget).get('email');
                  navigate(
                    typeof address === 'string' && address
                      ? `/register?email=${encodeURIComponent(address)}`
                      : '/register',
                  );
                }}
                className="w-full max-w-xs border-b-2 border-edge/60 pb-2"
              >
                <label
                  htmlFor="footer-email"
                  className="mb-1.5 block text-3xs font-bold uppercase tracking-[0.16em] text-content-faint"
                >
                  {t('landing.footer.startLabel')}
                </label>

                <div className="flex items-center gap-2">
                  <input
                    id="footer-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder={t('auth.emailPlaceholder')}
                    className="w-full border-none bg-transparent font-hand text-lg text-content outline-none placeholder:text-content-faint/60"
                  />
                  <button
                    type="submit"
                    aria-label={t('landing.footer.startAction')}
                    className="shrink-0 rounded-lg p-1 text-brand transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                  >
                    <ArrowRight aria-hidden className="h-5 w-5" />
                  </button>
                </div>
              </form>

              <nav className="flex flex-wrap gap-x-7 gap-y-2 text-base font-semibold">
                {[
                  { to: '/docs', label: 'landing.nav.docs' as const },
                  { to: '/themes', label: 'landing.footer.themes' as const },
                  { to: '/login', label: 'landing.nav.signIn' as const },
                  { to: '/terms', label: 'legal.terms' as const },
                  { to: '/privacy', label: 'legal.privacy' as const },
                ].map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    /* The wavy underline is the reference's one real signature. */
                    className="text-content transition-colors hover:text-brand hover:underline hover:decoration-wavy hover:decoration-2 hover:underline-offset-4"
                  >
                    {t(link.label)}
                  </Link>
                ))}
              </nav>

              <div className="flex flex-wrap items-center gap-3 text-2xs text-content-faint">
                <span>{t('landing.footer.rights')}</span>
                <span aria-hidden>•</span>
                <AuthorCredit />
              </div>
            </div>
          </div>
        </div>

        {/* ---------- The three pinned notes ---------- */}
        {/* In flow, pulled up over the board's bottom edge — not absolutely positioned. */}
        <div className="relative z-10 -mt-24 px-4 sm:px-6">
          <div className={cn('mx-auto grid w-full grid-cols-1 gap-5 sm:grid-cols-3', COLUMN_NARROW)}>
            {FOOTER_NOTES.map((note) => (
              <a
                key={note.href}
                href={note.href}
                target={note.href.startsWith('http') ? '_blank' : undefined}
                rel={note.href.startsWith('http') ? 'noreferrer noopener' : undefined}
                className="group relative block origin-top transition-transform duration-500 ease-studio hover:scale-[1.03]"
                style={{ rotate: `${note.tilt}deg` }}
              >
                <div
                  className="relative min-h-[9.5rem] rounded-sm p-5 shadow-lg transition-transform duration-500 ease-studio group-hover:rotate-0"
                  style={{ backgroundColor: note.sheet, rotate: `${-note.tilt * 1.6}deg` }}
                >
                  {/* The pin. `--danger` rather than a literal red, so the head belongs to the
                      skin the way the reference's does to its own palette. */}
                  <span
                    aria-hidden
                    className="absolute -top-2.5 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-danger shadow-md ring-2 ring-danger/30"
                  >
                    <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-white/40" />
                  </span>

                  {/* The note's words are carved on the runic skin until the sheet is pointed
                      at (the whole card is the `group`). */}
                  <span
                    className="mb-1.5 block pt-1 font-hand text-2xl font-bold"
                    style={{ color: note.ink }}
                  >
                    <RunicText wrap>{t(note.title)}</RunicText>
                  </span>
                  <p
                    className="font-hand text-base leading-snug"
                    style={{ color: note.ink, opacity: 0.85 }}
                  >
                    <RunicText wrap>{t(note.body)}</RunicText>
                  </p>
                  <p
                    className="mt-3 break-all text-sm font-semibold tracking-tight"
                    style={{ color: note.ink }}
                  >
                    {note.detail}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

/**
 * The three notes pinned across the footer's bottom edge. Data rather than three near-identical
 * blocks of markup: they differ in four values and agree on everything else.
 */
const FOOTER_NOTES = [
  {
    title: 'landing.footer.note1Title' as const,
    body: 'landing.footer.note1Body' as const,
    detail: '@JPacademico',
    href: 'https://github.com/JPacademico/Task-Studio',
    sheet: '#fde68a',
    ink: '#4a3d0d',
    tilt: -2,
  },
  {
    title: 'landing.footer.note2Title' as const,
    body: 'landing.footer.note2Body' as const,
    detail: 'github.com/.../issues',
    href: 'https://github.com/JPacademico/Task-Studio/issues',
    sheet: '#fbcfe8',
    ink: '#6b1442',
    tilt: 2,
  },
  {
    title: 'landing.footer.note3Title' as const,
    body: 'landing.footer.note3Body' as const,
    detail: 'task-studio.online/docs',
    href: '/docs',
    sheet: '#bfdbfe',
    ink: '#12395e',
    tilt: -1,
  },
];

/** Who made it. */
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

      {/* The card. Parked above the line, revealed on hover or on focus reaching anything
          inside the group — which on this element is the link itself. */}
      <span
        /* `aria-hidden`, not `role="tooltip"`. The card says exactly what the link's `aria-label`
           already says. */
        aria-hidden
        className={cn(
          /* Hidden below `sm`, and nothing is lost by it. This is a hover affordance, and a touch
             screen cannot hover. */
          'pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2',
          'hidden sm:block',
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
