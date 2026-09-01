import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Github, Sparkles } from 'lucide-react';

import { wakeApi } from '@/shared/api/client';
import { buttonClasses, StudioMark } from '@/shared/ui';
import { useT } from '@/shared/i18n';
import { DemoBoard } from './ui/demo-board';
import { DemoChat } from './ui/demo-chat';
import { DemoFrame } from './ui/demo-frame';
import { DemoImport } from './ui/demo-import';
import { FeatureNotes } from './ui/feature-notes';
import { IntegrationsStrip } from './ui/integrations-strip';
import { LandingNav } from './ui/landing-nav';
import { RotatingWord } from './ui/rotating-word';

/**
 * The front door.
 *
 * ## Why this exists at all
 *
 * Because the root address used to answer a stranger with a password field.
 * That is the app assuming a relationship it has not got: somebody who has
 * just heard about the product and typed the address in has no account, no
 * reason to make one yet, and no way to find out what they would be signing up
 * for. `ProtectedRoute` sends a guest here now, and `GuestRoute` keeps anybody
 * who *is* signed in out — so the same URL means "my work" to a user and "what
 * is this" to a visitor, which is the only arrangement that serves both.
 *
 * ## Why the demos are built rather than filmed
 *
 * The three loops below are the page's whole argument, and every one of them
 * is assembled from the app's own components and design tokens rather than
 * being a screen recording. The reasoning is set out in full on `DemoFrame`;
 * the short version is that a video would be several megabytes off a free
 * tier, frozen in one of thirteen skins, and stale the day a button moved.
 *
 * ## Why there is no pricing, no testimonials and no logo wall
 *
 * There is no pricing to state, nobody has said anything quotable yet, and the
 * only logos that could honestly appear are of things the product *connects
 * to* — which is what the connections section is. Every one of those sections
 * exists on the pages this was modelled on and every one of them would be
 * furniture here. The page says what the thing is, shows it working, lists
 * what it plugs into, and asks. That is the whole of it.
 */
const LandingPage = () => {
  const t = useT();
  const reduceMotion = useReducedMotion();

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

  return (
    <div className="min-h-dvh bg-surface">
      <LandingNav />

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
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-edge bg-surface-raised px-3 py-1 text-[11px] font-medium text-content-muted"
          >
            <Sparkles aria-hidden className="h-3 w-3 text-brand" />
            {t('landing.hero.badge')}
          </motion.p>

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

          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12 }}
            className="mt-6 max-w-xl text-base leading-relaxed text-content-muted sm:text-lg"
          >
            {t('landing.hero.body')}
          </motion.p>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.18 }}
            className="mt-8 flex flex-wrap items-center gap-2.5"
          >
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
          </motion.div>

          <motion.p
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.28 }}
            className="mt-4 text-xs text-content-faint"
          >
            {t('landing.hero.reassurance')}
          </motion.p>
        </div>
      </section>

      {/* ================= THE DEMOS ================= */}
      <section id="how" className="scroll-mt-20 border-t border-edge/70 bg-surface-sunken/30">
        <div className="mx-auto w-full max-w-6xl space-y-16 px-4 py-16 sm:space-y-24 sm:px-6 sm:py-24">
          <header className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
              {t('landing.how.eyebrow')}
            </p>
            <h2 className="mt-2 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              {t('landing.how.title')}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-content-muted">
              {t('landing.how.body')}
            </p>
          </header>

          <DemoFrame
            tab={t('landing.demo.boardTab')}
            eyebrow={t('landing.demo.boardEyebrow')}
            title={t('landing.demo.boardTitle')}
            body={t('landing.demo.boardBody')}
          >
            <DemoBoard />
          </DemoFrame>

          <DemoFrame
            side="right"
            tab={t('landing.demo.importTab')}
            eyebrow={t('landing.demo.importEyebrow')}
            title={t('landing.demo.importTitle')}
            body={t('landing.demo.importBody')}
          >
            <DemoImport />
          </DemoFrame>

          <DemoFrame
            tab={t('landing.demo.chatTab')}
            eyebrow={t('landing.demo.chatEyebrow')}
            title={t('landing.demo.chatTitle')}
            body={t('landing.demo.chatBody')}
          >
            <DemoChat />
          </DemoFrame>
        </div>
      </section>

      {/* ================= CONNECTIONS ================= */}
      <section id="connects" className="scroll-mt-20 border-t border-edge/70">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <header className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
              {t('landing.connects.eyebrow')}
            </p>
            <h2 className="mt-2 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              {t('landing.connects.title')}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-content-muted">
              {t('landing.connects.body')}
            </p>
          </header>

          <div className="mt-8">
            <IntegrationsStrip />
          </div>
        </div>
      </section>

      {/* ================= WHAT IS INSIDE ================= */}
      <section
        id="inside"
        className="scroll-mt-20 border-t border-edge/70 bg-surface-sunken/30"
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <header className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
              {t('landing.inside.eyebrow')}
            </p>
            <h2 className="mt-2 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              {t('landing.inside.title')}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-content-muted">
              {t('landing.inside.body')}
            </p>
          </header>

          <div className="mt-12">
            <FeatureNotes />
          </div>
        </div>
      </section>

      {/* ================= CLOSING ================= */}
      <section className="border-t border-edge/70">
        <div className="mx-auto w-full max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-28">
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
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-edge/70 bg-surface-sunken/40">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-8 sm:px-6">
          <span className="inline-flex items-center gap-2 text-xs font-semibold">
            <StudioMark className="h-5 w-5 text-brand" />
            Task Studio
          </span>

          <p className="text-[11px] text-content-faint">{t('landing.footer.tagline')}</p>

          <a
            href="https://github.com"
            target="_blank"
            // `noopener` is the one that matters — without it the opened page
            // gets a handle on this one through `window.opener`.
            rel="noreferrer noopener"
            className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-content-muted transition-colors hover:text-content"
          >
            <Github aria-hidden className="h-3.5 w-3.5" />
            {t('landing.footer.source')}
          </a>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
