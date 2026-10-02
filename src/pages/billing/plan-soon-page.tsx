import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Github, HardHat } from 'lucide-react';

import { useSessionStore } from '@/features/auth/model/session.store';
import { useT } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { DangerTape, LavaSurface, buttonClasses } from '@/shared/ui';

/** The plans this page knows how to name. Anything else is named generically. */
const PLAN_LABEL: Record<string, string> = {
  STARTUP: 'Startup',
  BARON: 'Baron',
};

/** Where a plan button goes while payments are switched off. */
export const PlanSoonPage = () => {
  const t = useT();
  const [params] = useSearchParams();
  const reduceMotion = useReducedMotion();

  // The way back depends on which side of the sign-in line the reader is on. This page is public -
  // a pricing table is read mostly by people without an account.
  const isSignedIn = useSessionStore((state) => state.status === 'authenticated');

  const plan = params.get('plan') ?? '';
  const planName = PLAN_LABEL[plan.toUpperCase()] ?? '';

  useEffect(() => {
    document.title = `${t('planSoon.title')} · Task Studio`;
  }, [t]);

  return (
    /* Full height, not the shell's height minus its bar: this route sits
       outside `AppLayout` now, so there is no top bar to subtract. */
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-12">
      {/* Tape rather than a border: a border says "this box is special", tape says "being worked on". */}
      <DangerTape />

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

            {/* Wrapping, and that is the whole fix for a row of two. */}
            <div className="mt-7 flex w-full flex-col flex-wrap gap-2.5 sm:flex-row sm:items-center sm:justify-center">
              <Link
                to={isSignedIn ? '/settings' : '/welcome'}
                className={buttonClasses({ variant: 'lava', size: 'md' })}
              >
                {/* The wax - `buttonClasses` cannot put children inside an anchor, so without
                    this the lamp is a still gradient. */}
                <LavaSurface />
                <span className="relative inline-flex items-center justify-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  {t(isSignedIn ? 'planSoon.back' : 'planSoon.backHome')}
                </span>
              </Link>

              {/* The repository, not a mailbox. There is no support address for this product. */}
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

        {/* The Post-it, pinned half off the card's corner. The product's own material, used to
            say the one thing a reader most wants after "not yet". */}
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
          {/* Explicit near-black on the note rather than a token. The sheet is a fixed Post-it
              yellow on every skin — it is the product's material, not the theme's. */}
          <p className="text-[0.7rem] font-medium leading-snug text-[#3f3616]">
            {t('planSoon.note')}
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default PlanSoonPage;
