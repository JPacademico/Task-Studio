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
    <div className="relative space-y-8">
      {/* --- The controls -------------------------------------------------

          Two halves, in two places, because they answer two different
          questions. *Where am I* belongs above the demos, where the reader
          meets it before deciding the section is finished. *Take me on*
          belongs beside them.

          The arrows used to sit up here too, tucked into the right-hand end of
          this row: a pair of small buttons a long way from anything they act
          on, and a long way from the pointer by the time somebody had read
          three panels. They are pinned to the vertical middle of the whole
          section now, one on each edge, which is where a hand reaches for
          "next" and where the eye already is. */}
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

      {/*
        A ceiling as well as a floor.

        Three demos are not all the same height, so a page of shorter ones would
        let the section collapse and drag the rest of the document up — the same
        class of jump the chat demo used to cause on its own. The minimum is the
        tallest page's height, so the arrows never move under the pointer.

        The number is the *tallest page's* height at each width, measured,
        rather than a round figure — which is the whole of what makes the
        section stop moving. It was 42rem, which no page has ever been: every
        page overflowed the floor, so the floor did nothing and the section
        was simply as tall as whichever page was showing. Paging then resized
        the document under the reader, and so did every loop inside a page
        that grew a row mid-cycle — which is what put everything below this
        section on a five-second rise and fall. The loops no longer change
        their own height either; see the note at the top of `demo-more`.

        Three values because the frames stack below `lg` and the copy rewraps
        below `sm`, and one page of three demos is nearly twice as tall
        stacked as it is in two columns. They are floors, not ceilings, so
        copy that grows later makes the section taller rather than being cut
        off — the failure worth designing for, given these strings are
        translated and Portuguese runs longer than English.

        `overflow-hidden` therefore never clips content: a `min-height` box
        grows with whatever is in it. What it clips is the 28px the pages
        slide sideways as they change, which on a phone is wider than the
        page's own padding.

        The floor lives on the *page* rather than on this box, and that pairing
        with `justify-between` is what stops a short page leaving a hole. A
        floor on the box would hold the section's height and stack three demos
        at the top of it, so page two would end a third of a screen above page
        one did — a void on a phone. On the page itself the same floor is a
        flex container taller than its contents, and the free space goes into
        the gaps between the demos instead of all of it to the bottom. Every
        page is the same height and every page looks deliberate.
      */}
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
              // The tallest page at each width, measured. See the note above.
              'min-h-[104rem] sm:min-h-[94rem] lg:min-h-[60rem]',
            )}
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

      {/* --- The arrows ---------------------------------------------------

          Absolutely placed against this wrapper, which spans the section, and
          centred on it vertically. Hidden below `md`: at that width they would
          be sitting on top of the demo they exist to reveal, the dots above
          still work, and on a phone they are the better control anyway.

          They sit *inside* the column until `xl` and step out into the page
          margin above it. Straddling the edge at every width was the obvious
          first attempt and it put four pixels of button past the left edge of
          the document — which is a horizontal scrollbar on the whole page, for
          a control nobody had touched. The margin only exists once the column
          has stopped growing, so that is the width at which they can use it. */}
      <ArrowButton
        label={t('landing.how.previous')}
        onClick={() => go(-1)}
        className="left-0 xl:-translate-x-[calc(100%+0.5rem)]"
      >
        <ChevronLeft className="h-6 w-6" />
      </ArrowButton>
      <ArrowButton
        label={t('landing.how.next')}
        onClick={() => go(1)}
        className="right-0 xl:translate-x-[calc(100%+0.5rem)]"
      >
        <ChevronRight className="h-6 w-6" />
      </ArrowButton>
    </div>
  );
};

/**
 * One arrow. A square, not a disc, and big enough to be one.
 *
 * The pair used to be 32px circles in the corner of a header row, and two
 * things were wrong with that in a way that compounds: at that size a rounded
 * control reads as a decorative dot rather than something to press, and
 * something that small is a target somebody has to aim at. These are 56px
 * squares with the app's own card rounding - the shape the rest of the page is
 * made of - sitting at the vertical middle of the section on either side of it,
 * where a hand reaches without looking.
 *
 * `top-1/2` with `-translate-y-1/2` rather than a flex centre, because the
 * thing being centred on is the section's whole height and the button is out of
 * its flow entirely.
 */
const ArrowButton = ({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className={cn(
      'absolute top-1/2 z-20 hidden -translate-y-1/2 md:grid',
      'h-14 w-14 place-items-center rounded-xl border border-edge bg-surface-raised/90',
      'text-content-muted shadow-sm backdrop-blur',
      'transition-colors duration-150 hover:border-brand/60 hover:text-content',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
      'focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
      'active:scale-95',
      className,
    )}
  >
    {children}
  </button>
);
