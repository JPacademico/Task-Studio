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
 * One demo: the tab it wears, the claim it makes, and the loop that shows it.
 *
 * No `body` any more. Each of these carried a paragraph explaining the
 * mechanism the loop beside it was already playing — see the note on
 * `DemoFrame` for why that is a paragraph nobody can afford to read.
 */
interface Feature {
  tab: TranslationKey;
  title: TranslationKey;
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
              /*
               * Room for the arrows, and only as much as is actually missing.
               *
               * `(100vw - 100%) / 2` is the space outside this column: the page
               * margin plus the section's own gutter. Subtract it from what an
               * arrow needs — 20px of inset, its own width, 16px of clearance,
               * and 8px of slack because `vw` counts the scrollbar — and clamp
               * at zero. Above about 1400px that is negative, so the padding is
               * nothing at all and the frames keep every pixel they had before
               * the arrows were ever moved. Below it, the inset opens by exactly
               * the shortfall and no more.
               *
               * One value per breakpoint because the arrow itself changes size
               * at each one; the formula in between is continuous, so there is
               * no width at which a control lands on a heading. Nothing below
               * `lg`, because no arrow is drawn there to make room for.
               */
              'lg:[padding-inline:max(0px,calc(6.75rem-(100vw-100%)/2))]',
              'xl:[padding-inline:max(0px,calc(8.75rem-(100vw-100%)/2))]',
              // The tallest page at each width, measured. See the note above.
              // Re-measured every time the column width moves, which by now is
              // three times: when the demo paragraphs were removed, when the
              // arrows were given a lane, and when that lane was replaced by
              // the shortfall inset above. Tallest page measured 75.97rem at
              // 360, 76.94 at 640, 71.66 at 768, 59.83 at 1024 and 59.03 at
              // 1440 — so `sm` carries the same figure as the base because the
              // 640 case, not the 768 one, is the widest point of that range.
              'min-h-[78rem] sm:min-h-[78rem] lg:min-h-[61rem]',
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
              >
                {feature.render()}
              </DemoFrame>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* --- The arrows ---------------------------------------------------

          A layer as wide as the *window*, not as wide as the column.

          ## Why this is not padding on the content

          It was, and that was the wrong trade. Insetting the demos to open a
          lane put the controls comfortably outside them and cost the frames up
          to a third of their width, which is the one thing this section cannot
          spend: the panels are the argument, and a narrower panel is a smaller
          demo. The arrows are furniture around the content; furniture does not
          get to shrink the room.

          ## Why a full-bleed layer instead of negative offsets

          Because the honest constraint is that the page margin is not a fixed
          size. `max-w-6xl` stops growing at 1152px, so the space beside it is
          zero below that width, 64px at 1280 and 192px at 1536 — and a negative
          offset large enough to clear the column at one of those widths hangs
          off the document at another. An earlier attempt did exactly that and
          put four pixels of button past the left edge, which is a horizontal
          scrollbar for the whole page.

          This layer is `w-screen`, centred on the column, so its edges *are*
          the window's edges at every width with no arithmetic at all. The
          arrows sit 20px inside it and are therefore always as far apart as the
          screen allows — which is what was actually asked for — and always
          fully visible. Twenty rather than twelve because `vw` counts the
          scrollbar: the layer runs about 15px wider than the visible area, so
          half of that comes off each inset and 12 measured as 4px from the
          edge.

          ## What this concedes

Two things, and they are worth stating plainly.

          The arrows are hidden below `lg`. Under a thousand pixels the column
          fills the window, so an edge control has nowhere to be that is not on
          top of a panel — and buying it room there would mean spending a fifth
          of the demo's width on a button. The dots in the header row are a
          complete control by themselves, so below `lg` they are the whole of
          it and the frames keep every pixel they ever had.

          From `lg` up the pages carry an inset that opens only as far as the
          *shortfall* — see the `padding-inline` on the track. At `lg` and at
          1280 that is a real but small reduction; from about 1400px upward it
          computes to zero and the demos are exactly as wide as they were before
          the arrows moved anywhere.

          `pointer-events-none` on the layer with `pointer-events-auto` on the
          buttons: the layer spans the whole window and would otherwise swallow
          every click that lands beside the column. */}
      <div
        aria-hidden={false}
        className="pointer-events-none absolute inset-y-0 left-1/2 w-screen -translate-x-1/2"
      >
        <ArrowButton
          label={t('landing.how.previous')}
          onClick={() => go(-1)}
          className="pointer-events-auto left-5"
        >
          <ChevronLeft className="h-7 w-7 lg:h-8 lg:w-8 xl:h-9 xl:w-9" />
        </ArrowButton>
        <ArrowButton
          label={t('landing.how.next')}
          onClick={() => go(1)}
          className="pointer-events-auto right-5"
        >
          <ChevronRight className="h-7 w-7 lg:h-8 lg:w-8 xl:h-9 xl:w-9" />
        </ArrowButton>
      </div>
    </div>
  );
};

/**
 * One arrow. A square, not a disc, and big enough to be one.
 *
 * The pair began as 32px circles in the corner of a header row, became 56px
 * squares at the section's edges, and reach 96px here. Every step answered the
 * same complaint: at the smaller sizes they read as decoration sitting near the
 * demos rather than as the control that moves them. With the app's own card
 * rounding — the shape the rest of the page is made of — they are unmistakably
 * a pair of buttons.
 *
 * `top-1/2` with `-translate-y-1/2` rather than a flex centre, because the
 * thing being centred on is the section's whole height and the button is out of
 * its flow entirely. Nothing else on this element animates a transform, so the
 * translate is safe here in a way it was not on the theme switch.
 *
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
      'absolute top-1/2 z-20 hidden -translate-y-1/2 lg:grid',
      /*
       * Sized to the room that exists. `lg` has no page margin at all, so a
       * smaller button there means a smaller inset on the demos; from `xl` up
       * the margin arrives and it can be the full 96px the brief asked for.
       */
      'h-16 w-16 xl:h-24 xl:w-24',
      'place-items-center rounded-2xl border border-edge bg-surface-raised/90',
      'text-content-muted shadow-md backdrop-blur',
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
