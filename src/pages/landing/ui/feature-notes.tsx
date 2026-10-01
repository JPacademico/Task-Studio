import { useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { PushPin, RunicText } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useIsTouchDevice } from '@/shared/lib/hooks';
import { useRevealOnScroll } from '@/shared/lib/use-reveal-on-scroll';
import { useT, type TranslationKey } from '@/shared/i18n';
import { LucyCursor } from './lucy-cursor';

/** Where each note is pinned, as a percentage of the board. */
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
 * The wall, with the claim pinned in the middle of it. It was six equal boxes in three columns
 * under a heading and a paragraph.
 */
export const FeatureNotes = () => {
  const t = useT();
  const reduceMotion = useReducedMotion();
  const isTouch = useIsTouchDevice();
  const boardRef = useRef<HTMLDivElement>(null);

  // Dragging is off on touch, and that is not an oversight. A draggable note inside a vertically
  // scrolling page is a note that eats the scroll gesture.
  const isDraggable = !isTouch && !reduceMotion;

  // Whether the wall has been reached — and a guarantee that it appears either way.
  const isRevealed = useRevealOnScroll(boardRef);

  return (
    <div
      ref={boardRef}
      className={cn(
        'board-grid relative overflow-hidden rounded-3xl border border-edge',
        'bg-surface-sunken/40 p-4 sm:p-6',
        /* Taller than it was, and it earns the height now that the notes are short: a wall is
           mostly wall. */
        'lg:h-[44rem]',
      )}
    >
      {/* A teammate at work on the wall — first in the board so the heading,
          every note and anything being dragged paint over it. See `LucyCursor`. */}
      <LucyCursor boardRef={boardRef} />

      {/* --- The claim, pinned in the middle ---
          Centred absolutely on the desktop board and simply first in the flow on a phone. */}
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

      {/* The notes. */}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:block">
        {NOTES.map((note, index) => (
          <motion.li
            key={note.key}
            /* The drag layer, and nothing else. No `initial`, no `animate`, no `whileHover`. */
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
            // The note Lucy's arrow points at: the top-right one.
            data-lucy-target={note.key === 'landing.note.notes' ? '' : undefined}
            className={cn(
              'gpu relative lg:absolute lg:w-[13.5rem]',
              isDraggable && 'cursor-grab touch-none',
            )}
          >
            <motion.div
              // `group`: hovering the sheet is what turns its runes back into
              // Latin on the runic skin — see `RunicText`.
              className="group relative"
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
              /* Straightens and lifts under the pointer. The gesture the whole app is built on is
                 picking paper up. */
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

                {/* Carved on the runic skin until the sheet is picked up or pointed at — the
                    same trade the app's own rail makes. */}
                <h3 className="text-balance text-center font-hand text-lg font-semibold leading-tight">
                  <RunicText wrap>{t(note.key)}</RunicText>
                </h3>
              </div>
            </motion.div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
};
