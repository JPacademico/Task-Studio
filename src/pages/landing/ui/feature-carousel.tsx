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

/** One demo: the tab it wears, the claim it makes, and the loop that shows it. */
interface Feature {
  tab: TranslationKey;
  title: TranslationKey;
  body: TranslationKey;
  render: () => ReactNode;
}

/**
 * The nine, in the order somebody meets the product.
 *
 * The first three are the ones that were already here and they stay first for a
 * reason: moving work, starting from something you already have, and talking
 * about it are the three things everybody does in the first week. The six after
 * them are what the product turns out to be once you are in it.
 *
 * Themes are deliberately absent. They are the most *demonstrable* thing this
 * app does and they are getting a section of their own — putting a tenth loop
 * here would spend the reader's attention on the thing that is about to be
 * shown properly.
 */
const FEATURES: Feature[] = [
  {
    tab: 'landing.demo.boardTab',
    title: 'landing.demo.boardTitle',
    body: 'landing.demo.boardBody',
    render: () => <DemoBoard />,
  },
  {
    tab: 'landing.demo.importTab',
    title: 'landing.demo.importTitle',
    body: 'landing.demo.importBody',
    render: () => <DemoImport />,
  },
  {
    tab: 'landing.demo.chatTab',
    title: 'landing.demo.chatTitle',
    body: 'landing.demo.chatBody',
    render: () => <DemoChat />,
  },
  {
    tab: 'landing.demo.notesTab',
    title: 'landing.demo.notesTitle',
    body: 'landing.demo.notesBody',
    render: () => <DemoNotes />,
  },
  {
    tab: 'landing.demo.meetTab',
    title: 'landing.demo.meetTitle',
    body: 'landing.demo.meetBody',
    render: () => <DemoMeetings />,
  },
  {
    tab: 'landing.demo.pagesTab',
    title: 'landing.demo.pagesTitle',
    body: 'landing.demo.pagesBody',
    render: () => <DemoPages />,
  },
  {
    tab: 'landing.demo.undoTab',
    title: 'landing.demo.undoTitle',
    body: 'landing.demo.undoBody',
    render: () => <DemoUndo />,
  },
  {
    tab: 'landing.demo.commitTab',
    title: 'landing.demo.commitTitle',
    body: 'landing.demo.commitBody',
    render: () => <DemoCommit />,
  },
  {
    tab: 'landing.demo.drawTab',
    title: 'landing.demo.drawTitle',
    body: 'landing.demo.drawBody',
    render: () => <DemoWhiteboard />,
  },
];

/** Three to a page, so the section is the same height whichever one is showing. */
const PER_PAGE = 3;
const PAGES = Math.ceil(FEATURES.length / PER_PAGE);

/**
 * Nine demos in the height of three.
 *
 * ## Why paging rather than a longer section
 *
 * Because a landing page is a *sequence*, and nine full-width demos stacked is
 * a sequence nobody finishes. The three that were here already occupied most of
 * a screen each; nine would have been the page. Paging keeps the section's
 * height fixed — which is what the brief asked for, and it is the right ask —
 * so everything below it stays where the reader left it, and the six extra
 * features are available to anybody curious enough to press an arrow.
 *
 * ## Why a page of three and not one at a time
 *
 * A carousel showing one thing is a slideshow, and a slideshow is a thing
 * people leave. Three at a time keeps the *comparison* the original section was
 * making — these are different surfaces of one product — and makes the arrow an
 * offer of more rather than the only way to see anything at all.
 *
 * ## Why it does not advance on its own
 *
 * Every loop inside it is already moving. An auto-advancing container around
 * nine self-animating panels is two clocks competing for the same attention,
 * and it takes the page away from somebody mid-sentence. The arrows are the
 * only thing that moves it.
 */
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
    <div className="space-y-8">
      {/* --- The controls -------------------------------------------------

          Above the demos rather than below them: the reader has to know there
          is more *before* they have scrolled past three panels deciding the
          section is finished. */}
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

        <div className="ml-auto flex items-center gap-1.5">
          <ArrowButton label={t('landing.how.previous')} onClick={() => go(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </ArrowButton>
          <ArrowButton label={t('landing.how.next')} onClick={() => go(1)}>
            <ChevronRight className="h-4 w-4" />
          </ArrowButton>
        </div>
      </div>

      {/*
        A fixed floor under the pages.

        Three demos are not all the same height, so a page of shorter ones would
        let the section collapse and drag the rest of the document up — the same
        class of jump the chat demo used to cause on its own. The minimum is the
        tallest page's height, so the arrows never move under the pointer.
      */}
      <div className="relative min-h-[46rem] sm:min-h-[42rem]">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={page}
            custom={direction}
            initial={reduceMotion ? false : { opacity: 0, x: direction * 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction * -28 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="gpu space-y-16 sm:space-y-24"
          >
            {shown.map((feature, index) => (
              <DemoFrame
                key={feature.tab}
                // Still alternating down the page, and now the parity is
                // computed from the position *within the page* so page two does
                // not start on whichever side page one happened to end on.
                side={index % 2 === 1 ? 'right' : 'left'}
                tab={t(feature.tab)}
                title={t(feature.title)}
                body={t(feature.body)}
              >
                {feature.render()}
              </DemoFrame>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

/** One arrow. Square, quiet, and the same on both sides. */
const ArrowButton = ({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className={cn(
      'grid h-8 w-8 place-items-center rounded-xl border border-edge text-content-muted',
      'transition-colors duration-150 hover:border-brand/50 hover:text-content',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
      'focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
      'active:scale-95',
    )}
  >
    {children}
  </button>
);
