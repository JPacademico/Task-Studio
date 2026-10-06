import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui';
import { useT } from '@/shared/i18n';
import { TOUR_STEPS, type TourPlacement, type TourStep } from '../model/steps';
import { useTour } from '../model/tour.store';
import { TourStageMock } from './tour-mocks';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Breathing room round a highlighted target, and between it and the card. */
const PAD = 8;
const GAP = 14;
/** Nothing the tour draws comes closer than this to the window's edge. */
const MARGIN = 16;

const findTarget = (step: TourStep, stage: HTMLElement | null): Element | null => {
  if (!step.target) return null;
  if ('real' in step.target) return document.querySelector(`[data-tour="${step.target.real}"]`);
  return stage?.querySelector(`[data-tour-mock="${step.target.mock}"]`) ?? null;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

/** Where the card goes: beside the hole on the preferred side if it fits, else the roomiest side. */
const placeCard = (hole: Rect | null, width: number, height: number, preferred?: TourPlacement) => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (!hole) return { x: (vw - width) / 2, y: (vh - height) / 2 };

  const room: Record<TourPlacement, number> = {
    below: vh - (hole.y + hole.height) - GAP - MARGIN - height,
    above: hole.y - GAP - MARGIN - height,
    right: vw - (hole.x + hole.width) - GAP - MARGIN - width,
    left: hole.x - GAP - MARGIN - width,
  };
  const order: TourPlacement[] = ['below', 'above', 'right', 'left'];
  const side =
    preferred && room[preferred] >= 0
      ? preferred
      : order.filter((each) => room[each] >= 0).sort((a, b) => room[b] - room[a])[0];

  const alongX = clamp(hole.x + hole.width / 2 - width / 2, MARGIN, vw - width - MARGIN);
  const alongY = clamp(hole.y + hole.height / 2 - height / 2, MARGIN, vh - height - MARGIN);
  switch (side) {
    case 'below':
      return { x: alongX, y: hole.y + hole.height + GAP };
    case 'above':
      return { x: alongX, y: hole.y - GAP - height };
    case 'right':
      return { x: hole.x + hole.width + GAP, y: alongY };
    case 'left':
      return { x: hole.x - GAP - width, y: alongY };
    default:
      // No side has room (a phone): the card docks at the bottom, over everything but the target.
      return { x: (vw - width) / 2, y: vh - height - MARGIN };
  }
};

/** Corner rounding of the hole, matching a panel's. */
const HOLE_RADIUS = 14;

/**
 * The dim with a rounded hole in it, as a viewport-sized SVG mask. Not a giant box-shadow: a spread
 * that covers the screen makes a layer bigger than some GPUs will draw, and they drop it.
 */
const TourMask = ({ hole }: { hole: Rect | null }) => {
  const reduceMotion = useReducedMotion();
  // No target: the hole closes to a point in the middle, behind the centred card.
  const shape = hole ?? { x: window.innerWidth / 2, y: window.innerHeight / 2, width: 0, height: 0 };
  const geometry = { x: shape.x, y: shape.y, width: shape.width, height: shape.height };
  const transition = reduceMotion ? { duration: 0 } : { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <svg aria-hidden className="fixed inset-0 h-full w-full" style={{ pointerEvents: 'none' }}>
      <defs>
        <mask id="tour-mask">
          <rect width="100%" height="100%" fill="#fff" />
          <motion.rect initial={false} animate={geometry} transition={transition} rx={HOLE_RADIUS} fill="#000" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="#04060c" fillOpacity={0.66} mask="url(#tour-mask)" />
      <motion.rect
        className="tour-ring"
        initial={false}
        animate={{ ...geometry, opacity: hole ? 1 : 0 }}
        transition={transition}
        rx={HOLE_RADIUS}
        fill="none"
      />
    </svg>
  );
};

/**
 * The first-run tour. Blocks the app while it is open — `inert` on the app root and a transparent
 * shield over the window — and walks a highlight across the real page or a fake one.
 */
const TourOverlay = () => {
  const t = useT();
  const finish = useTour((state) => state.finish);
  const [index, setIndex] = useState(0);
  const [hole, setHole] = useState<Rect | null>(null);
  const [card, setCard] = useState<{ x: number; y: number } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const step = TOUR_STEPS[index];
  const isLast = index === TOUR_STEPS.length - 1;

  const next = useCallback(() => {
    if (isLast) finish();
    else setIndex((current) => current + 1);
  }, [finish, isLast]);
  const back = useCallback(() => setIndex((current) => Math.max(0, current - 1)), []);

  // The app underneath can be neither clicked, focused nor scrolled while the tour is up.
  useEffect(() => {
    const app = document.getElementById('root');
    const html = document.documentElement;
    const overflow = html.style.overflow;
    app?.setAttribute('inert', '');
    html.style.overflow = 'hidden';
    window.scrollTo({ top: 0 });
    return () => {
      app?.removeAttribute('inert');
      html.style.overflow = overflow;
    };
  }, []);

  const measure = useCallback(() => {
    const rect = findTarget(step, stageRef.current)?.getBoundingClientRect();
    let nextHole: Rect | null = null;
    if (rect && rect.width > 0) {
      // Kept inside the window, so a target flush with an edge still shows its whole frame.
      const left = Math.max(2, rect.left - PAD);
      const top = Math.max(2, rect.top - PAD);
      const right = Math.min(window.innerWidth - 2, rect.right + PAD);
      const bottom = Math.min(window.innerHeight - 2, rect.bottom + PAD);
      nextHole = { x: left, y: top, width: right - left, height: bottom - top };
    }
    setHole(nextHole);

    const element = cardRef.current;
    if (element) setCard(placeCard(nextHole, element.offsetWidth, element.offsetHeight, step.placement));
  }, [step]);

  // After the step's screen and text are in the DOM, before the browser paints them.
  useLayoutEffect(measure, [measure]);

  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  useEffect(() => {
    nextRef.current?.focus({ preventScroll: true });
  }, [index]);

  // Keys are taken in the capture phase, so the app's own Escape and arrow handlers never see them.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish();
      else if (event.key === 'ArrowRight') next();
      else if (event.key === 'ArrowLeft') back();
      else if (event.key === 'Tab') {
        const focusable = cardRef.current?.querySelectorAll<HTMLElement>('button');
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const outside = !cardRef.current?.contains(document.activeElement);
        if (outside || (event.shiftKey && document.activeElement === first)) {
          (event.shiftKey ? last : first).focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          first.focus();
        } else {
          return;
        }
      } else {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [back, finish, next]);

  return createPortal(
    <div className="tour fixed inset-0 z-[200]">
      <div ref={stageRef}>
        <TourStageMock stage={step.stage} />
      </div>

      <TourMask hole={hole} />

      {/* Takes every click, including on the highlighted target: the tour shows, it does not drive. */}
      <div aria-hidden className="fixed inset-0" />

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('tour.label')}
        aria-describedby="tour-body"
        className="tour-card panel fixed left-0 top-0 w-[min(22rem,calc(100vw-2rem))] p-4 sm:p-5"
        style={{
          transform: card ? `translate(${card.x}px, ${card.y}px)` : undefined,
          visibility: card ? 'visible' : 'hidden',
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-3xs font-semibold uppercase tracking-[0.18em] text-content-faint" aria-live="polite">
            {t('tour.step', { current: String(index + 1), total: String(TOUR_STEPS.length) })}
          </p>
          <button
            type="button"
            onClick={finish}
            aria-label={t('tour.skip')}
            className="grid h-7 w-7 place-items-center rounded-lg text-content-faint transition-colors hover:bg-surface-sunken hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <h2 className="mt-1.5 text-base font-semibold leading-snug">{t(step.title)}</h2>
        <p id="tour-body" className="mt-1.5 text-xs leading-relaxed text-content-muted">
          {t(step.body)}
        </p>

        {/* Where you are in it, as dots: the count above is for screen readers as much as anyone. */}
        <div aria-hidden className="mt-4 flex gap-1">
          {TOUR_STEPS.map((each, dot) => (
            <span
              key={each.id}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors duration-300',
                dot <= index ? 'bg-brand' : 'bg-edge',
              )}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={finish}>
            {t('tour.skip')}
          </Button>
          <span className="flex-1" />
          {index > 0 && (
            <Button variant="outline" size="sm" onClick={back}>
              {t('tour.back')}
            </Button>
          )}
          <Button ref={nextRef} size="sm" onClick={next}>
            {t(isLast ? 'tour.finish' : 'tour.next')}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default TourOverlay;
