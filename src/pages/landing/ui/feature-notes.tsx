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
 */
const NOTES: {
  key: TranslationKey;
  body: TranslationKey;
  colour: string;
  tilt: number;
  /** Desktop placement. Percentages of the board, from its top-left. */
  x: number;
  y: number;
}[] = [
  { key: 'landing.note.boards', body: 'landing.note.boardsBody', colour: '#fde68a', tilt: -3, x: 2, y: 4 },
  { key: 'landing.note.notes', body: 'landing.note.notesBody', colour: '#bfdbfe', tilt: 2.5, x: 68, y: 1 },
  { key: 'landing.note.meetings', body: 'landing.note.meetingsBody', colour: '#bbf7d0', tilt: -1.5, x: 0, y: 40 },
  { key: 'landing.note.docs', body: 'landing.note.docsBody', colour: '#fbcfe8', tilt: 3, x: 70, y: 38 },
  { key: 'landing.note.undo', body: 'landing.note.undoBody', colour: '#ddd6fe', tilt: -2.5, x: 6, y: 74 },
  { key: 'landing.note.skins', body: 'landing.note.skinsBody', colour: '#fed7aa', tilt: 1.8, x: 66, y: 76 },
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
 * ## Why the notes can be dragged
 *
 * Because the sentence in the middle says this is a studio rather than a
 * spreadsheet, and a wall of paper that cannot be touched is a spreadsheet with
 * a texture. One drag is the shortest possible proof — and it is the same
 * gesture, with the same spring, that the real board uses.
 *
 * They snap back. A landing page that could be left in a mess by a passing
 * visitor is a landing page that eventually *is* one, and the position carries
 * no meaning here the way it does on a real board.
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
        // Tall enough on a desktop for six notes to sit around a heading
        // without touching it. On a phone the absolute placement is dropped
        // entirely — see the note on the list below.
        'lg:h-[38rem]',
      )}
    >
      {/* --- The claim, pinned in the middle ---------------------------------

          Centred absolutely on the desktop board and simply first in the flow
          on a phone. It is a heading either way; only its placement changes. */}
      {/*
        Two elements, and the split is load-bearing.

        The outer one positions: it is centred on the board with a translate,
        which is the only way to centre a box whose width is set by its own text.
        The inner one animates.

        They cannot be the same element. Framer Motion writes `transform`
        directly as an inline style the moment it animates `scale`, which
        overrides Tailwind's `-translate-x-1/2 -translate-y-1/2` entirely — so a
        single element carrying both ended up pinned by its top-left corner
        instead of its centre, sitting low and to the right and overlapping a
        note. The same collision is documented on `ChatPin`, where the drag owns
        the transform for the same reason.
      */}
      <div
        className={cn(
          'relative z-10 mx-auto mb-6 max-w-sm text-center lg:mb-0',
          'lg:absolute lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2',
        )}
      >
        <motion.h2
          initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
          animate={isRevealed ? { opacity: 1, scale: 1 } : undefined}
          transition={{ type: 'spring', stiffness: 220, damping: 24 }}
          className="text-balance text-3xl font-bold tracking-tight sm:text-4xl"
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
      <ul className="grid gap-4 sm:grid-cols-2 lg:block">
        {NOTES.map((note, index) => (
          <motion.li
            key={note.key}
            drag={isDraggable}
            dragConstraints={boardRef}
            dragElastic={0.12}
            dragMomentum={false}
            /* Back where it was pinned, once let go. See the note on the
               component for why the wall does not stay rearranged. */
            dragSnapToOrigin
            whileDrag={{ scale: 1.06, rotate: 0, zIndex: 30, cursor: 'grabbing' }}
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
             * Straightens and lifts under the pointer. The gesture the whole app
             * is built on is picking paper up, and a note that squares itself
             * when you look at it is that gesture at rest.
             */
            whileHover={reduceMotion ? undefined : { rotate: 0, y: -6, scale: 1.03, zIndex: 20 }}
            style={
              // The absolute placement only exists on the wall layout. Inline
              // rather than in a class because the values are per-note data.
              { left: `${note.x}%`, top: `${note.y}%` } as React.CSSProperties
            }
            className={cn(
              'gpu relative lg:absolute lg:w-[15rem]',
              isDraggable && 'cursor-grab touch-none',
            )}
          >
            {/* The pin sits above the paper and outside its padding, so the
                note reads as hanging from it rather than as containing it. */}
            <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 text-danger drop-shadow">
              <PushPin isPinned className="h-6 w-6" />
            </span>

            <div
              className={cn(
                'relative min-h-[9.5rem] rounded-[4px] p-4 pt-6',
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

              <h3 className="font-hand text-lg font-semibold leading-tight">{t(note.key)}</h3>
              {/* The same hand as the title, one size down. A note written in
                  two typefaces is not a note — it is a card with a heading,
                  which is the thing this section exists not to be. */}
              <p className="mt-1.5 font-hand text-[0.9375rem] leading-snug text-[#1a1a22]/80">
                {t(note.body)}
              </p>
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
};
