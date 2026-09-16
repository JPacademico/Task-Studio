import { useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Github, HardHat } from 'lucide-react';

import { useSessionStore } from '@/features/auth/model/session.store';
import { useT } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { LavaSurface, buttonClasses } from '@/shared/ui';

/** The plans this page knows how to name. Anything else is named generically. */
const PLAN_LABEL: Record<string, string> = {
  STARTUP: 'Startup',
  BARON: 'Baron',
};

/**
 * Where a plan button goes while payments are switched off.
 *
 * ## Why a page and not a toast
 *
 * Because the thing being communicated is not "that failed" — nothing failed —
 * it is "this part of the product is not finished yet, and here is what to do
 * instead". A toast says the first and has nowhere to put the second; it also
 * disappears, which is the wrong behaviour for an answer somebody may want to
 * read twice.
 *
 * It replaces a 404. A missing route was what a plan button reached while the
 * Stripe catalogue was half-configured, and a 404 is the single least
 * informative thing this product could say at the exact moment somebody is
 * trying to give it money: it reads as "you are lost", when the truth is "we
 * are not ready".
 *
 * ## Why the workbench rather than a spinner or a padlock
 *
 * A spinner implies something is happening and it will finish while you wait.
 * A padlock implies you are not allowed. Neither is true. The room is being
 * built, and the honest illustration of that is the one the product already
 * uses for everything else: paper, tape and a note somebody left.
 */
export const PlanSoonPage = () => {
  const t = useT();
  const [params] = useSearchParams();
  const reduceMotion = useReducedMotion();

  /*
   * The way back depends on which side of the sign-in line the reader is on.
   *
   * This page is public - a pricing table is read mostly by people without an
   * account, and answering "can I buy this" with a password field would be
   * absurd. But that means "Back to settings" is a promise the page cannot
   * keep for half its readers: a guest following it is bounced to sign-in,
   * from a page they reached by pressing a button on a marketing page.
   *
   * So a guest is sent back where they came from, which is the landing page.
   */
  const isSignedIn = useSessionStore((state) => state.status === 'authenticated');

  const plan = params.get('plan') ?? '';
  const planName = PLAN_LABEL[plan.toUpperCase()] ?? '';

  useEffect(() => {
    document.title = `${t('planSoon.title')} · Task Studio`;
  }, [t]);

  /*
   * A fixed set of tilts, not random ones.
   *
   * A layout somebody has looked at and approved should be the same layout on
   * the next load — the same argument `HeroField` makes about its scatter, and
   * the same reason neither uses `Math.random()`.
   */
  const tape = useMemo(
    () => [
      { top: '18%', rotate: -7, delay: 0 },
      { top: '74%', rotate: 5, delay: 0.12 },
    ],
    [],
  );

  return (
    /* Full height, not the shell's height minus its bar: this route sits
       outside `AppLayout` now, so there is no top bar to subtract. */
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-12">
      {/*
        Hazard tape, running off both edges.

        Two bands rather than a border, because a border says "this box is
        special" and tape says "this area is being worked on" — which is the
        actual message. They sit behind the card and run past it on both sides so
        the card reads as something taped *over* the work rather than as a
        decorated panel.
      */}
      {tape.map((band, index) => (
        <motion.div
          key={index}
          aria-hidden
          initial={reduceMotion ? false : { opacity: 0, x: index % 2 ? 60 : -60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: band.delay, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none absolute left-[-10%] w-[120%] opacity-[0.16]"
          style={{
            top: band.top,
            rotate: `${band.rotate}deg`,
            height: '3.25rem',
            /*
             * The stripes are the warning token rather than a literal yellow,
             * so the band belongs to whichever skin is active — on `terminal`
             * it is green, on `volcano` it is orange. A hard-coded hazard yellow
             * was the one thing on this page that looked imported from
             * somewhere else.
             */
            backgroundImage:
              'repeating-linear-gradient(45deg, rgb(var(--warning)) 0 1.25rem, transparent 1.25rem 2.5rem)',
          }}
        />
      ))}

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-lg"
      >
        {/* The card is paper: a raised surface with a real edge, tilted a
            degree so it reads as something set down rather than laid out. */}
        <div className="relative -rotate-1 rounded-2xl border border-edge bg-surface-raised p-8 shadow-xl sm:p-10">
          {/* A single piece of tape holding it to the page. */}
          <div
            aria-hidden
            className="absolute -top-3 left-1/2 h-6 w-28 -translate-x-1/2 rotate-2 rounded-[2px] bg-content/10 backdrop-blur-[1px]"
          />

          <div className="flex flex-col items-center text-center">
            <motion.span
              aria-hidden
              className="mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-warning/15 text-warning"
              animate={
                reduceMotion
                  ? undefined
                  : { rotate: [0, -9, 0, 9, 0], transition: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' } }
              }
            >
              <HardHat className="h-8 w-8" strokeWidth={2} />
            </motion.span>

            <h1 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
              {t('planSoon.title')}
            </h1>

            <p className="mt-3 text-balance text-sm leading-relaxed text-content-muted">
              {planName
                ? t('planSoon.bodyNamed', { plan: planName })
                : t('planSoon.body')}
            </p>

            <p className="mt-2 text-xs text-content-faint">{t('planSoon.reassure')}</p>

            <div className="mt-7 flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center">
              <Link
                to={isSignedIn ? '/settings' : '/welcome'}
                className={buttonClasses({ variant: 'lava', size: 'md' })}
              >
                {/* The wax - `buttonClasses` cannot put children inside an
                    anchor, so without this the lamp is a still gradient. Same
                    composition `LavaLink` does on the landing page. */}
                <LavaSurface />
                <span className="relative inline-flex items-center justify-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  {t(isSignedIn ? 'planSoon.back' : 'planSoon.backHome')}
                </span>
              </Link>

              {/*
                The repository, not a mailbox.

                There is no support address for this product — inventing one
                would be a dead letter with a real-looking name on it — and the
                issue tracker is where "tell me when this opens" actually gets
                answered for an open-source project.
              */}
              <a
                href="https://github.com/JPacademico/Task-Studio/issues"
                target="_blank"
                rel="noreferrer noopener"
                className={cn(buttonClasses({ variant: 'secondary', size: 'md' }))}
              >
                <Github className="h-4 w-4" />
                {t('planSoon.notify')}
              </a>
            </div>
          </div>
        </div>

        {/*
          The Post-it, pinned half off the card's corner.

          The product's own material, used to say the one thing a reader most
          wants after "not yet": that nothing they already have is affected.
        */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 14, rotate: 0 }}
          animate={{ opacity: 1, y: 0, rotate: 3 }}
          transition={{ duration: 0.5, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="absolute -bottom-9 -right-3 w-48 rounded-sm bg-[#fde68a] p-3 text-left shadow-lg sm:-right-8"
        >
          <span
            aria-hidden
            className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-danger shadow ring-2 ring-danger/30"
          />
          {/*
            Explicit near-black on the note rather than a token.

            The sheet is a fixed Post-it yellow on every skin — it is the
            product's material, not the theme's — so its text has to be legible
            against *that*, not against whatever `--content` happens to be. On a
            dark skin the token is near-white, which on this sheet is unreadable.
          */}
          <p className="text-[0.7rem] font-medium leading-snug text-[#3f3616]">
            {t('planSoon.note')}
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default PlanSoonPage;
