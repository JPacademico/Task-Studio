import { useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { PushPin } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useIsTouchDevice } from '@/shared/lib/hooks';
import { useRevealOnScroll } from '@/shared/lib/use-reveal-on-scroll';
import { useT, type TranslationKey } from '@/shared/i18n';

/**
 * Where each note is pinned, as a percentage of the board.
 *
 * ## Why the positions are hand-placed and not a grid
 *
 * Because a grid of Post-its is a table wearing paper, and the section's whole
 * argument is that this product is not a table. These six sit at angles and
 * offsets somebody would actually leave them at, arranged *around* the heading
 * in the middle — which is the layout a real wall takes when there is something
 * already pinned in the centre of it.
 *
 * ## Why they are hand-placed and not random
 *
 * A random arrangement per render means the wall rebuilds itself on every
 * navigation, which reads as instability rather than as texture — and a
 * genuinely random set reliably drops two notes on top of each other. These are
 * fixed, so the wall is the same wall every time somebody comes back, and no
 * two adjacent notes share an angle.
 *
 * The tilts are small. A note at fifteen degrees is a graphic; one at three is a
 * piece of paper somebody put down in a hurry.
 *
 * ## Why they no longer carry a sentence
 *
 * Each of these used to have two lines of explanation under its title, which
 * turned a Post-it into a card with a heading — the exact shape the section
 * exists not to be — and forced every note to be tall enough for the longest of
 * them. A real sticky note is a few words somebody could write standing up.
 * With the bodies gone the paper is a third of the height, the wall has room to
 * breathe, and the six claims read at a glance instead of being read.
 */
const NOTES: {
  key: TranslationKey;
  colour: string;
  tilt: number;
  /** Desktop placement. Percentages of the board, from its top-left. */
  x: number;
  y: number;
}[] = [
  { key: 'landing.note.boards', colour: '#fde68a', tilt: -3, x: 3, y: 8 },
  { key: 'landing.note.notes', colour: '#bfdbfe', tilt: 2.5, x: 74, y: 4 },
  { key: 'landing.note.meetings', colour: '#bbf7d0', tilt: -1.5, x: 1, y: 44 },
  { key: 'landing.note.docs', colour: '#fbcfe8', tilt: 3, x: 76, y: 42 },
  { key: 'landing.note.undo', colour: '#ddd6fe', tilt: -2.5, x: 7, y: 76 },
  { key: 'landing.note.skins', colour: '#fed7aa', tilt: 1.8, x: 72, y: 78 },
];

/**
 * The wall, with the claim pinned in the middle of it.
 *
 * ## Why this stopped being a grid of cards
 *
 * It was six equal boxes in three columns under a heading and a paragraph — the
 * exact "same-size cards of icon plus heading plus text" shape that every
 * product page uses, on the one section of this page whose subject is that the
 * product is *not* that. The medium was arguing against the message.
 *
 * It is now the thing it is describing: a board, with the heading pinned to the
 * centre of it and the six claims stuck up around it. Nothing about the section
 * needs explaining any more, which is why the paragraph that used to explain it
 * is gone.
 *
 * ## Why the notes stay where they are dropped
 *
 * They used to spring back to their pin the instant they were let go, on the
 * reasoning that a landing page which can be left in a mess eventually *is* one.
 * That reasoning was about the wrong risk. The mess is invisible — the position
 * is per visitor, per page load, and nobody else ever sees it — while the
 * snap-back was extremely visible, and it undid the one gesture the section
 * exists to demonstrate. Picking a note up and having it jump out of your hand
 * is not a demonstration that this behaves like paper; it is a demonstration
 * that it does not.
 *
 * So a dragged note stays put, exactly as it would on the real board. A reload
 * puts the wall back.
 *
 * ## Why the drag and the entrance live on two different elements
 *
 * Because they would otherwise fight over the same `transform`. Framer writes
 * drag offsets into the very `x`/`y` motion values an `animate` prop drives, so
 * a note that also animated its own `y` — for the entrance, or on hover — would
 * have its dropped position overwritten the next time either target changed.
 * The outer element owns the drag and nothing else; the inner one owns the
 * entrance, the tilt and the hover. The same collision is documented on the
 * heading below and on `ChatPin`.
 *
 * ## Why the entrance is scroll-driven, and why it cannot fail closed
 *
 * A mount animation would have finished, unseen, before the reader arrived —
 * the section is most of a screen below the fold — and they would meet a static
 * wall. Pinned in sequence as it comes into view, it reads as somebody putting
 * the notes up.
 *
 * It is driven by `useRevealOnScroll` rather than Framer's `whileInView`, and
 * the difference is what happens when the `IntersectionObserver` callback never
 * arrives: `whileInView` leaves the notes at `opacity: 0` permanently, so the
 * entire section is blank. This is content, not decoration, so the reveal has a
 * timer under it and the animation is the enhancement.
 */
export const FeatureNotes = () => {
  const t = useT();
  const reduceMotion = useReducedMotion();
  const isTouch = useIsTouchDevice();
  const boardRef = useRef<HTMLDivElement>(null);

  /*
   * Dragging is off on touch, and that is not an oversight.
   *
   * A draggable note inside a vertically scrolling page is a note that eats the
   * scroll gesture: the finger that meant to move the page moves a Post-it
   * instead, and the reader is stuck on this section. On a pointer there is no
   * such ambiguity, because scrolling is a different device entirely.
   */
  const isDraggable = !isTouch && !reduceMotion;

  /*
   * Whether the wall has been reached — and a guarantee that it appears either
   * way.
   *
   * `whileInView` would be the obvious way to write this and it is the wrong
   * one for a section that *is* the content: it leaves the notes at
   * `opacity: 0` for good if the `IntersectionObserver` callback never arrives,
   * which is a real state in a throttled tab and behind some privacy
   * extensions. See `useRevealOnScroll`.
   */
  const isRevealed = useRevealOnScroll(boardRef);

  return (
    <div
      ref={boardRef}
      className={cn(
        'board-grid relative overflow-hidden rounded-3xl border border-edge',
        'bg-surface-sunken/40 p-4 sm:p-6',
        /*
         * Taller than it was, and it earns the height now that the notes are
         * short: a wall is mostly wall, and six pieces of paper crowded into a
         * shallow box reads as a list that has been scattered rather than as a
         * board somebody uses. The section around it was widened to match — see
         * `LandingPage`.
         */
        'lg:h-[44rem]',
      )}
    >
      {/* --- The claim, pinned in the middle ---------------------------------

          Centred absolutely on the desktop board and simply first in the flow
          on a phone. It is a heading either way; only its placement changes.

          Two elements, and the split is load-bearing. The outer one positions:
          it is centred on the board with a translate, which is the only way to
          centre a box whose width is set by its own text. The inner one
          animates.

          They cannot be the same element. Framer Motion writes `transform`
          directly as an inline style the moment it animates `scale`, which
          overrides Tailwind's `-translate-x-1/2 -translate-y-1/2` entirely — so
          a single element carrying both ended up pinned by its top-left corner
          instead of its centre, sitting low and to the right and overlapping a
          note. */}
      <div
        className={cn(
          'relative z-10 mx-auto mb-6 max-w-md text-center lg:mb-0',
          'lg:absolute lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2',
        )}
      >
        <motion.h2
          initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
          animate={isRevealed ? { opacity: 1, scale: 1 } : undefined}
          transition={{ type: 'spring', stiffness: 220, damping: 24 }}
          className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
        >
          {t('landing.inside.title')}
        </motion.h2>
      </div>

      {/*
        The notes.

        A plain stacked list below `lg`, and an absolutely-placed wall above it.
        The arrangement is the point of the section and it needs room to be one;
        at 390px wide, six overlapping notes around a heading is a pile.
      */}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:block">
        {NOTES.map((note, index) => (
          <motion.li
            key={note.key}
            /*
             * The drag layer, and nothing else. No `initial`, no `animate`, no
             * `whileHover` — every one of those would write the transform this
             * element is holding the dropped position in. See the component
             * note.
             */
            drag={isDraggable}
            dragConstraints={boardRef}
            dragElastic={0.12}
            dragMomentum={false}
            whileDrag={{ zIndex: 40, cursor: 'grabbing' }}
            style={
              // The absolute placement only exists on the wall layout. Inline
              // rather than in a class because the values are per-note data.
              { left: `${note.x}%`, top: `${note.y}%` } as React.CSSProperties
            }
            className={cn(
              'gpu relative lg:absolute lg:w-[13.5rem]',
              isDraggable && 'cursor-grab touch-none',
            )}
          >
            <motion.div
              className="relative"
              initial={reduceMotion ? false : { opacity: 0, y: -18, scale: 0.86, rotate: 0 }}
              animate={isRevealed ? { opacity: 1, y: 0, scale: 1, rotate: note.tilt } : undefined}
              transition={{
                type: 'spring',
                stiffness: 260,
                damping: 20,
                // Pinned in sequence rather than all at once — six notes landing
                // on the same frame is a flash, not somebody putting them up.
                delay: Math.min(index * 0.09, 0.5),
              }}
              /*
               * Straightens and lifts under the pointer. The gesture the whole
               * app is built on is picking paper up, and a note that squares
               * itself when you look at it is that gesture at rest.
               */
              whileHover={reduceMotion ? undefined : { rotate: 0, y: -6, scale: 1.04 }}
            >
              {/* The pin sits above the paper and outside its padding, so the
                  note reads as hanging from it rather than as containing it. */}
              <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 text-danger drop-shadow">
                <PushPin isPinned className="h-6 w-6" />
              </span>

              <div
                className={cn(
                  'relative grid min-h-[6.5rem] place-items-center rounded-[4px] px-4 pb-4 pt-6',
                  'text-[#1a1a22] shadow-[0_18px_36px_-20px_rgb(0_0_0/0.6)]',
                )}
                style={{ backgroundColor: note.colour }}
              >
                {/* The peeled corner, exactly as the sign-in desk draws it. */}
                <span
                  aria-hidden
                  className="absolute right-0 top-0 h-7 w-7 bg-black/10"
                  style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}
                />

                <h3 className="text-balance text-center font-hand text-lg font-semibold leading-tight">
                  {t(note.key)}
                </h3>
              </div>
            </motion.div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
};
