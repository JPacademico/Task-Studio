import { useEffect, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { HardHat, Monitor, Smartphone } from 'lucide-react';

import { useMediaQuery } from '@/shared/lib/hooks';
import { cn } from '@/shared/lib/cn';
import { useT } from '@/shared/i18n';
import { StudioMark } from '@/shared/ui';

/** The short side of the screen, under which a device is a phone. */
const PHONE_SHORT_SIDE = 600;

/**
 * Paths that stay open on a phone. Empty on purpose, and it is the one line to change if that turns
 * out to be the wrong call.
 */
const ALWAYS_OPEN: readonly string[] = [];

/** What a phone gets until the mobile build is finished. */
export const MobileGate = ({ children }: { children: ReactNode }) => {
  // Two queries rather than one `or`, so the resolved value is a plain boolean in JavaScript.
  const isNarrow = useMediaQuery(`(max-width: ${PHONE_SHORT_SIDE}px)`);
  const isShort = useMediaQuery(`(max-height: ${PHONE_SHORT_SIDE}px)`);
  const isTouch = useMediaQuery('(pointer: coarse)');

  const isPhone = isTouch && (isNarrow || isShort);
  const isOpenPath = ALWAYS_OPEN.includes(window.location.pathname);

  if (!isPhone || isOpenPath) return <>{children}</>;

  return <MobileConstruction />;
};

/**
 * The notice itself: the product's own material, saying one thing. Built out of what the app
 * already is — a Post-it, tape, the skin's tokens.
 */
const MobileConstruction = () => {
  const t = useT();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    document.title = `${t('mobile.title')} · Task Studio`;
  }, [t]);

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-surface px-5 py-10">
      {/* Hazard tape, running off both edges. Two bands rather than a border: a border says
          "this box is special" and tape says "this area is being worked on". */}
      {[
        { top: '16%', rotate: -8 },
        { top: '78%', rotate: 6 },
      ].map((band, index) => (
        <motion.div
          key={index}
          aria-hidden
          initial={reduceMotion ? false : { opacity: 0, scaleX: 0.7 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.6, delay: index * 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none absolute -left-8 -right-8 h-9"
          style={{
            top: band.top,
            rotate: `${band.rotate}deg`,
            backgroundImage:
              'repeating-linear-gradient(45deg, rgb(var(--warning)) 0 14px, rgb(var(--surface-sunken)) 14px 28px)',
            opacity: 0.22,
          }}
        />
      ))}

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="panel relative w-full max-w-sm px-6 py-8 text-center"
      >
        <StudioMark className="mx-auto h-12 w-12 text-brand" />

        <span
          aria-hidden
          className={cn(
            'mx-auto mt-6 grid h-14 w-14 place-items-center rounded-2xl',
            'border border-edge bg-surface-sunken text-warning',
          )}
        >
          {/* The hat nods, rather than spinning or bouncing. This is a screen somebody has
              arrived at by accident and will read once. */}
          <motion.span
            animate={
              reduceMotion
                ? undefined
                : { rotate: [0, -8, 0, 8, 0], transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' } }
            }
          >
            <HardHat className="h-7 w-7" />
          </motion.span>
        </span>

        <h1 className="ui-section-title mt-5 text-lg font-semibold tracking-tight">
          {t('mobile.title')}
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-content-muted">{t('mobile.body')}</p>

        {/* What to do instead, as two rows rather than a sentence. "Open it on a computer" is
            the whole instruction. */}
        <div className="mt-6 space-y-2 text-left">
          <Hint icon={<Monitor className="h-4 w-4" />} text={t('mobile.desktop')} />
          <Hint icon={<Smartphone className="h-4 w-4" />} text={t('mobile.tablet')} />
        </div>

        {/* The Post-it, pinned half off the card's corner — the product's own material, used to
            say the one thing somebody turned away most wants to know: that this is a date. */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12, rotate: 0 }}
          animate={{ opacity: 1, y: 0, rotate: 3 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute -bottom-7 -right-2 w-40 rounded-sm bg-[#fde68a] p-2.5 text-left shadow-lg"
        >
          <span
            aria-hidden
            className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-danger shadow ring-2 ring-danger/30"
          />
          {/* Explicit near-black on the note rather than a token: the sheet is a fixed Post-it
              yellow on every skin — it is the product's material, not the theme's. */}
          <p className="text-[0.7rem] font-medium leading-snug text-[#3f3616]">
            {t('mobile.note')}
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

const Hint = ({ icon, text }: { icon: ReactNode; text: string }) => (
  <p className="flex items-start gap-2.5 rounded-xl border border-edge bg-surface-sunken px-3 py-2 text-xs leading-relaxed text-content-muted">
    <span aria-hidden className="mt-px shrink-0 text-content-faint">
      {icon}
    </span>
    {text}
  </p>
);
