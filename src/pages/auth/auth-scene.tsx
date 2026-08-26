import { useState } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { CalendarClock, Check, Clock3, Link2, ListChecks, Paperclip } from 'lucide-react';

import { useT } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { PushPin } from '@/shared/ui';

/**
 * The desk the sign-in screen is built on.
 *
 * The whole viewport is the surface now, not a decorative half: every object is
 * a physical thing the product is actually made of — a Post-it, a pinned card, a
 * paperclip, a stopwatch — scattered across the full width and picked up with
 * the pointer. Nothing animates layout: each object is a transform on its own
 * compositor layer, so the entire scene costs one paint.
 */

/** Shared floating loop, offset per object so the desk never pulses in unison. */
const floatTransition = (delay: number) => ({
  duration: 7 + delay,
  repeat: Infinity,
  ease: 'easeInOut' as const,
  delay,
});

interface DeskObjectProps {
  className?: string;
  /** Seconds of offset into the float loop. */
  delay?: number;
  tilt?: number;
  children: React.ReactNode;
  /** Told to the user on hover — the objects are the copy. */
  title?: string;
  /** Keeps every object inside the viewport instead of off the edge. */
  bounds?: React.RefObject<HTMLElement | null>;
}

/**
 * A thing you can pick up.
 *
 * Two layers, deliberately: the outer one carries the drag transform, the inner
 * one carries the idle float. Driving both from a single element means the same
 * `transform` property is written by two owners, and the float wins the frame
 * the pointer lets go.
 */
const DeskObject = ({
  className,
  delay = 0,
  tilt = 0,
  children,
  title,
  bounds,
}: DeskObjectProps) => {
  const reduceMotion = useReducedMotion();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // Lag the rotation behind the drag, so the paper trails the pointer.
  const rotate = useSpring(useTransform(x, [-260, 260], [tilt - 14, tilt + 14]), {
    stiffness: 260,
    damping: 26,
  });

  return (
    <motion.div
      title={title}
      drag={!reduceMotion}
      dragMomentum={false}
      dragElastic={0.12}
      dragConstraints={bounds as React.RefObject<Element>}
      dragTransition={{ bounceStiffness: 320, bounceDamping: 26 }}
      style={{ x, y, rotate }}
      whileHover={{ scale: 1.06, zIndex: 30 }}
      whileTap={{ scale: 1.1, cursor: 'grabbing' }}
      whileDrag={{ zIndex: 30 }}
      className={cn('gpu absolute cursor-grab touch-none select-none', className)}
    >
      <motion.div
        animate={reduceMotion ? undefined : { y: [0, -14, 0] }}
        transition={floatTransition(delay)}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

/** The hero object: a Post-it you can actually tick off. */
const HeroNote = ({ bounds }: { bounds: React.RefObject<HTMLElement | null> }) => {
  const t = useT();
  const [isDone, setIsDone] = useState(false);

  return (
    <DeskObject
      bounds={bounds}
      className="left-[5%] top-[14%] xl:left-[8%]"
      delay={0}
      tilt={-6}
      title={t('auth.desk.tickIt')}
    >
      <div className="relative w-[190px] rounded-[4px] bg-[#fde68a] p-4 text-[#1a1a22] shadow-[0_20px_40px_-18px_rgb(0_0_0/0.65)]">
        {/* Peeled corner. */}
        <span
          aria-hidden
          className="absolute right-0 top-0 h-7 w-7 bg-black/10"
          style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}
        />
        {/* The pin holding it to the wall. */}
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[#b91c1c] drop-shadow">
          <PushPin isPinned className="h-6 w-6" />
        </span>

        <p className="font-hand text-[13px] font-bold uppercase tracking-wide opacity-55">{t('auth.desk.today')}</p>

        <button
          type="button"
          onClick={() => setIsDone((done) => !done)}
          onPointerDown={(event) => event.stopPropagation()}
          className="mt-2 flex w-full items-start gap-2 text-left"
        >
          <span
            className={cn(
              'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-[4px] border-2 transition-colors duration-200',
              isDone ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-[#1a1a22]/40',
            )}
          >
            <motion.span
              initial={false}
              animate={{ scale: isDone ? 1 : 0, opacity: isDone ? 1 : 0 }}
              transition={{ type: 'spring', stiffness: 520, damping: 18 }}
            >
              <Check className="h-3 w-3" strokeWidth={4} />
            </motion.span>
          </span>

          <span className="relative font-hand text-[17px] leading-snug">
            {t('auth.desk.designIt')}
            <motion.span
              aria-hidden
              initial={false}
              animate={{ scaleX: isDone ? 1 : 0 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-0 top-1/2 h-[2px] w-full origin-left bg-[#1a1a22]/70"
            />
          </span>
        </button>
      </div>
    </DeskObject>
  );
};

/** A second sheet, deeper in the stack. */
const SmallNote = ({ bounds }: { bounds: React.RefObject<HTMLElement | null> }) => {
  const t = useT();

  return (
  <DeskObject
    bounds={bounds}
    className="right-[7%] top-[10%]"
    delay={1.4}
    tilt={7}
    title={t('auth.desk.dragMe')}
  >
    <div className="w-[132px] rounded-[4px] bg-[#bfdbfe] p-3 text-[#1a1a22] shadow-[0_16px_32px_-16px_rgb(0_0_0/0.6)]">
      <span
        aria-hidden
        className="float-right h-5 w-5 bg-black/10"
        style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}
      />
      <p className="font-hand text-[15px] leading-tight">{t('auth.desk.shipFriday')}</p>
      <div className="mt-2 space-y-1">
        <span className="block h-[3px] w-full rounded-full bg-black/15" />
        <span className="block h-[3px] w-2/3 rounded-full bg-black/15" />
      </div>
    </div>
  </DeskObject>
  );
};

/** A third sheet in the far corner, so the wide screen never goes empty. */
const ChecklistNote = ({ bounds }: { bounds: React.RefObject<HTMLElement | null> }) => {
  const t = useT();

  return (
  <DeskObject
    bounds={bounds}
    className="bottom-[12%] right-[9%]"
    delay={2.8}
    tilt={-5}
    title={t('auth.desk.halfDone')}
  >
    <div className="w-[150px] rounded-[4px] bg-[#bbf7d0] p-3 text-[#1a1a22] shadow-[0_16px_32px_-16px_rgb(0_0_0/0.6)]">
      <p className="flex items-center gap-1.5 font-hand text-[14px] font-bold leading-tight">
        <ListChecks className="h-3.5 w-3.5" />
        {t('auth.desk.thisWeek')}
      </p>
      <ul className="mt-2 space-y-1.5">
        {[true, true, false].map((done, index) => (
          <li key={index} className="flex items-center gap-1.5">
            <span
              className={cn(
                'grid h-3 w-3 shrink-0 place-items-center rounded-[2px] border',
                done ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-[#1a1a22]/40',
              )}
            >
              {done && <Check className="h-2 w-2" strokeWidth={4} />}
            </span>
            <span
              className={cn(
                'h-[3px] rounded-full bg-black/20',
                done ? 'w-16 opacity-45' : 'w-20',
              )}
            />
          </li>
        ))}
      </ul>
    </div>
  </DeskObject>
  );
};

/** A mini task card, so the scene shows both halves of the product. */
const TaskChip = ({ bounds }: { bounds: React.RefObject<HTMLElement | null> }) => {
  const t = useT();

  return (
  <DeskObject
    bounds={bounds}
    className="bottom-[15%] left-[8%]"
    delay={2.2}
    tilt={-3}
    title={t('auth.desk.miniTask')}
  >
    {/*
      Drawn in design tokens, not in white.

      Every one of these was `white/10` on a frosted panel, which is a card on
      a dark desk and a blank rectangle on a light one — the desk is
      `bg-surface`, and in light mode that is `246 246 248`. The card was
      genuinely there; the only parts of it anybody could see were the brand
      spine, the green pill and the three avatars, floating on nothing.

      Tokens give the same glass on the dark palette and an actual card on the
      light one, and the whole thing now follows a skin change for free.
    */}
    <div className="relative w-[172px] overflow-hidden rounded-xl border border-edge bg-surface-raised/85 p-3 shadow-[0_16px_32px_-18px_rgb(0_0_0/0.45)] backdrop-blur-md">
      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-brand" />
      <p className="text-[11px] font-semibold text-content">{t('auth.desk.rollOut')}</p>
      <div className="mt-2 flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-sunken px-1.5 py-0.5 text-[9px] font-medium text-content-muted">
          <Clock3 className="h-2.5 w-2.5" />
          2d
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-positive/15 px-1.5 py-0.5 text-[9px] font-medium text-positive">
          {t('auth.desk.onTime')}
        </span>
        <span className="ml-auto flex -space-x-1.5">
          {['#f472b6', '#818cf8', '#34d399'].map((tone) => (
            <span
              key={tone}
              className="h-4 w-4 rounded-full ring-2 ring-surface-raised"
              style={{ background: tone }}
            />
          ))}
        </span>
      </div>
    </div>
  </DeskObject>
  );
};

/** Stationery. Small, quiet, reacts to the pointer. */
const Trinket = ({
  className,
  delay,
  tone,
  title,
  bounds,
  children,
}: {
  className: string;
  delay: number;
  tone: string;
  title: string;
  bounds: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}) => (
  <DeskObject bounds={bounds} className={className} delay={delay} title={title}>
    <motion.span
      whileHover={{ rotate: 12 }}
      className={cn(
        // Same reasoning as the task chip: a white hairline on a white desk is
        // not a hairline. `tone` carries the fill, and every caller now passes
        // one built out of tokens.
        'grid h-11 w-11 place-items-center rounded-2xl border border-edge backdrop-blur-md',
        'shadow-[0_10px_24px_-16px_rgb(0_0_0/0.45)]',
        tone,
      )}
    >
      {children}
    </motion.span>
  </DeskObject>
);

/**
 * The desk itself.
 *
 * `bounds` is the element every object is kept inside — the whole page, so the
 * user can drag a Post-it from one corner of the screen to the other without
 * ever losing it off an edge.
 */
export const AuthScene = ({ bounds }: { bounds: React.RefObject<HTMLElement | null> }) => {
  const t = useT();

  return (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    {/* Depth: brand blooms and a soft grid, all pure CSS. */}
    <div
      aria-hidden
      className="absolute -left-24 -top-24 h-[460px] w-[460px] rounded-full bg-brand/30 blur-[130px]"
    />
    <div
      aria-hidden
      className="absolute -bottom-32 right-[-10%] h-[420px] w-[420px] rounded-full bg-brand/20 blur-[130px]"
    />
    <div
      aria-hidden
      className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/[0.12] blur-[150px]"
    />
    <div aria-hidden className="board-grid absolute inset-0 opacity-40" />

    {/* Objects take the pointer back. */}
    <div className="pointer-events-auto absolute inset-0">
      <HeroNote bounds={bounds} />
      <SmallNote bounds={bounds} />
      <ChecklistNote bounds={bounds} />
      <TaskChip bounds={bounds} />

      <Trinket
        bounds={bounds}
        className="left-[19%] top-[46%]"
        delay={0.8}
        tone="bg-surface-raised/85 text-content-muted"
        title={t('auth.desk.clipOn')}
      >
        <Paperclip className="h-5 w-5" />
      </Trinket>

      <Trinket
        bounds={bounds}
        className="right-[20%] top-[42%]"
        delay={3}
        tone="bg-brand/20 text-brand"
        title={t('auth.desk.connect')}
      >
        <Link2 className="h-5 w-5" />
      </Trinket>

      <Trinket
        bounds={bounds}
        className="bottom-[26%] left-[24%]"
        delay={4.2}
        tone="bg-surface-raised/85 text-content-muted"
        title={t('auth.desk.deadlines')}
      >
        <CalendarClock className="h-5 w-5" />
      </Trinket>
    </div>
  </div>
  );
};
