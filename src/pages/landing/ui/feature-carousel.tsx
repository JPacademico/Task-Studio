import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { useT, type TranslationKey } from '@/shared/i18n';
import { DemoBoard } from './demo-board';
import { DemoChat } from './demo-chat';
import { DemoFrame } from './demo-frame';
import { DemoImport } from './demo-import';
import {
  DemoCommit,
  DemoMeetings,
  DemoNotes,
  DemoPages,
  DemoUndo,
  DemoWhiteboard,
} from './demo-more';

/**
 * One demo: the tab it wears, the claim it makes, and the loop that shows it. No `body` any more.
 */
interface Feature {
  tab: TranslationKey;
  title: TranslationKey;
  render: () => ReactNode;
}

/**
 * The nine, in the order somebody meets the product. The first three are the ones that were already
 * here and they stay first for a reason: moving work, starting from something you already have.
 */
const FEATURES: Feature[] = [
  {
    tab: 'landing.demo.boardTab',
    title: 'landing.demo.boardTitle',
    render: () => <DemoBoard />,
  },
  {
    tab: 'landing.demo.importTab',
    title: 'landing.demo.importTitle',
    render: () => <DemoImport />,
  },
  {
    tab: 'landing.demo.chatTab',
    title: 'landing.demo.chatTitle',
    render: () => <DemoChat />,
  },
  {
    tab: 'landing.demo.notesTab',
    title: 'landing.demo.notesTitle',
    render: () => <DemoNotes />,
  },
  {
    tab: 'landing.demo.meetTab',
    title: 'landing.demo.meetTitle',
    render: () => <DemoMeetings />,
  },
  {
    tab: 'landing.demo.pagesTab',
    title: 'landing.demo.pagesTitle',
    render: () => <DemoPages />,
  },
  {
    tab: 'landing.demo.undoTab',
    title: 'landing.demo.undoTitle',
    render: () => <DemoUndo />,
  },
  {
    tab: 'landing.demo.commitTab',
    title: 'landing.demo.commitTitle',
    render: () => <DemoCommit />,
  },
  {
    tab: 'landing.demo.drawTab',
    title: 'landing.demo.drawTitle',
    render: () => <DemoWhiteboard />,
  },
];

/** Three to a page, so the section is the same height whichever one is showing. */
const PER_PAGE = 3;
const PAGES = Math.ceil(FEATURES.length / PER_PAGE);

/** Nine demos in the height of three. */
export const FeatureCarousel = () => {
  const t = useT();
  const reduceMotion = useReducedMotion();

  const [page, setPage] = useState(0);
  /** Which way the last move went, so the pages slide the way the arrow points. */
  const [direction, setDirection] = useState(1);

  const go = (delta: number) => {
    setDirection(delta);
    setPage((current) => (current + delta + PAGES) % PAGES);
  };

  const shown = FEATURES.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  return (
    <div
      /* Half the arrow's width, which is what centring it in the page margin needs — see
         `ArrowButton`. */
      className="relative space-y-8 [--arrow-half:2rem] xl:[--arrow-half:3rem]"
    >
      {/* --- The controls ---
          Two halves, in two places, because they answer two different questions. */}
      <div className="flex items-center gap-3">
        <p className="text-2xs uppercase tracking-[0.16em] text-content-faint">
          {t('landing.how.page', { page: String(page + 1), total: String(PAGES) })}
        </p>

        {/* The dots are a position indicator and a control. Three of them, so
            they are worth the pixels — a dozen would be decoration. */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: PAGES }, (_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                setDirection(index > page ? 1 : -1);
                setPage(index);
              }}
              aria-label={t('landing.how.goToPage', { page: String(index + 1) })}
              aria-current={index === page ? 'true' : undefined}
              className={cn(
                'h-1.5 rounded-full transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
                index === page ? 'w-5 bg-brand' : 'w-1.5 bg-edge hover:bg-content-faint',
              )}
            />
          ))}
        </div>

      </div>

      {/* A ceiling as well as a floor. */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={page}
            custom={direction}
            initial={reduceMotion ? false : { opacity: 0, x: direction * 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction * -28 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'gpu flex flex-col justify-between gap-14 sm:gap-20',
              /* Room for the arrows, and only as much as is actually missing. `(100vw - 100%) / 2`
                 is the space outside this column: the page margin plus the section's own gutter. */
              'lg:[padding-inline:max(0px,calc(6.75rem-(100vw-100%)/2))]',
              'xl:[padding-inline:max(0px,calc(8.75rem-(100vw-100%)/2))]',
              // The tallest page at each width, measured.
              'min-h-[78rem] sm:min-h-[78rem] lg:min-h-[61rem]',
            )}
          >
            {shown.map((feature, index) => (
              <DemoFrame
                key={feature.tab}
                // Still alternating down the page, and now the parity is computed from the position
                // *within the page*.
                side={index % 2 === 1 ? 'right' : 'left'}
                tab={t(feature.tab)}
                title={t(feature.title)}
              >
                {feature.render()}
              </DemoFrame>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* --- The arrows ---
          A layer as wide as the *window*, not as wide as the column. */}
      <ArrowButton
        side="left"
        label={t('landing.how.previous')}
        onClick={() => go(-1)}
      >
        <ChevronLeft className="h-7 w-7 xl:h-9 xl:w-9" />
      </ArrowButton>
      <ArrowButton
        side="right"
        label={t('landing.how.next')}
        onClick={() => go(1)}
      >
        <ChevronRight className="h-7 w-7 xl:h-9 xl:w-9" />
      </ArrowButton>
    </div>
  );
};

/**
 * One arrow. A square, not a disc, and big enough to be one. The pair began as 32px circles in the
 * corner of a header row, became 56px squares at the section's edges, and reach 96px here.
 */
const ArrowButton = ({
  side,
  label,
  onClick,
  children,
}: {
  side: 'left' | 'right';
  label: string;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    /* The offset as a value rather than a utility class. Tailwind can express this —
       `left-[max(calc(-1_*_(50vw_-_50%)...))]`. */
    style={{
      [side]:
        'max(calc(-1 * (50vw - 50%) + 1.75rem), calc(-1 * (50vw - 50%) / 2 - var(--arrow-half)))',
    }}
    className={cn(
      'absolute top-1/2 z-20 hidden -translate-y-1/2 lg:grid',
      /* Sized to the room that exists. `lg` has no page margin at all, so a smaller button there
         means a smaller inset on the demos. */
      'h-16 w-16 xl:h-24 xl:w-24',
      'place-items-center rounded-2xl border border-edge bg-surface-raised/90',
      'text-content-muted shadow-md backdrop-blur',
      'transition-colors duration-150 hover:border-brand/60 hover:text-content',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
      'focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
      'active:scale-95',
    )}
  >
    {children}
  </button>
);
