import { useEffect, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { HardHat, Monitor, Smartphone } from 'lucide-react';

import { useMediaQuery } from '@/shared/lib/hooks';
import { cn } from '@/shared/lib/cn';
import { useT } from '@/shared/i18n';
import { StudioMark } from '@/shared/ui';

/**
 * The short side of the screen, under which a device is a phone.
 *
 * ## Why the short side and not the width
 *
 * Because a phone in landscape is 844px wide, and a tablet in portrait is 768 —
 * so width alone puts them the wrong way round, and the one instruction here
 * was that tablets carry on working. Every phone on the market has a short side
 * at or under 440px (the largest is 430); every tablet has one at or over 744.
 * 600 sits in the gap with room on both sides and no device anywhere near it.
 *
 * ## Why `pointer: coarse` as well
 *
 * So that a narrow *desktop window* is never caught. Somebody with a browser
 * docked to half a 1280px screen is 640px wide and is not on a phone; dragging
 * a window should never produce a construction notice. The pointer query is the
 * part that actually says "this is a touch device" — the size query only says
 * which kind.
 */
const PHONE_SHORT_SIDE = 600;

/**
 * Paths that stay open on a phone.
 *
 * Empty on purpose, and it is the one line to change if that turns out to be
 * the wrong call. The instruction was that the *site* waits for its mobile
 * build, and the honest reading of that is all of it — a sign-in screen that
 * works on a phone and leads to an app that does not is a worse experience than
 * being told plainly at the door.
 *
 * The argument on the other side is real and worth writing down: `/welcome` is
 * the page that exists for people who are not users yet, it is already
 * responsive, and a phone visitor who cannot read it cannot find out what this
 * is in order to open it on a desktop later. If that matters more than the
 * consistency, this becomes `['/welcome', '/docs', '/plans/soon']` and nothing
 * else has to change.
 */
const ALWAYS_OPEN: readonly string[] = [];

/**
 * What a phone gets until the mobile build is finished.
 *
 * ## Why a gate and not a responsive layout
 *
 * Because there is not one yet, and the two honest options are "make it work"
 * or "say it does not". The dishonest third option is what was there before: a
 * desktop layout that technically renders at 390px, where the board is a
 * horizontal scroll inside a vertical scroll, the rails cover the content they
 * are navigating, and every dialog is taller than the viewport. Somebody who
 * meets that concludes the product is broken. Somebody who meets this concludes
 * it is unfinished, which is true, and is a far better thing to conclude.
 *
 * ## Why it reads the viewport rather than the user agent
 *
 * A user-agent string is a claim a browser makes about itself and is wrong
 * often enough to be useless — desktop-mode toggles, in-app webviews and every
 * privacy extension all rewrite it. The media queries below describe what is
 * actually true of the screen in front of the reader, they re-evaluate when the
 * device is rotated or the browser chrome collapses, and they need no
 * dependency at all.
 */
export const MobileGate = ({ children }: { children: ReactNode }) => {
  /*
   * Two queries rather than one `or`, so the resolved value is a plain boolean
   * in JavaScript. `(max-width: …) or (max-height: …)` inside a single query is
   * valid modern syntax and is quietly dropped by older engines, which would
   * fail *open* — the gate would silently stop working on exactly the old
   * browsers most likely to be on a small phone.
   */
  const isNarrow = useMediaQuery(`(max-width: ${PHONE_SHORT_SIDE}px)`);
  const isShort = useMediaQuery(`(max-height: ${PHONE_SHORT_SIDE}px)`);
  const isTouch = useMediaQuery('(pointer: coarse)');

  const isPhone = isTouch && (isNarrow || isShort);
  const isOpenPath = ALWAYS_OPEN.includes(window.location.pathname);

  if (!isPhone || isOpenPath) return <>{children}</>;

  return <MobileConstruction />;
};

/**
 * The notice itself: the product's own material, saying one thing.
 *
 * Built out of what the app already is — a Post-it, tape, the skin's tokens —
 * rather than a centred paragraph on a white page, because the first thing a
 * reader should take from it is that the thing they cannot open yet is made
 * with some care.
 */
const MobileConstruction = () => {
  const t = useT();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    document.title = `${t('mobile.title')} · Task Studio`;
  }, [t]);

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-surface px-5 py-10">
      {/*
        Hazard tape, running off both edges.

        Two bands rather than a border: a border says "this box is special" and
        tape says "this area is being worked on", which is the actual message.
        They run past the card on both sides so it reads as something taped over
        the work rather than as a decorated panel — the same device the plan
        page uses, for the same reason.
      */}
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
          {/*
            The hat nods, rather than spinning or bouncing.

            This is a screen somebody has arrived at by accident and will read
            once. A looping animation on it would be the only moving thing on a
            page whose message is "nothing is happening here yet".
          */}
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

        {/*
          What to do instead, as two rows rather than a sentence.

          "Open it on a computer" is the whole instruction, and a reader who has
          just been turned away is not going to read a paragraph to find it.
        */}
        <div className="mt-6 space-y-2 text-left">
          <Hint icon={<Monitor className="h-4 w-4" />} text={t('mobile.desktop')} />
          <Hint icon={<Smartphone className="h-4 w-4" />} text={t('mobile.tablet')} />
        </div>

        {/*
          The Post-it, pinned half off the card's corner — the product's own
          material, used to say the one thing somebody turned away most wants to
          know: that this is a date, not a decision.
        */}
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
          {/*
            Explicit near-black on the note rather than a token: the sheet is a
            fixed Post-it yellow on every skin — it is the product's material,
            not the theme's — so its text has to be legible against *that*. On a
            dark skin `--content` is near-white, which on this sheet is
            unreadable.
          */}
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
