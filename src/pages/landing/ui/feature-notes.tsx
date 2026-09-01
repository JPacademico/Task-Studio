import { motion, useReducedMotion } from 'framer-motion';

import { PushPin } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useT, type TranslationKey } from '@/shared/i18n';

/**
 * The features, written on the thing the product is made of.
 *
 * ## Why Post-its rather than cards with icons
 *
 * Because the app's entire premise is that work behaves like paper — the notes
 * board, the task Post-its, the pinned sign-in desk are all one idea — and a
 * feature grid drawn as rounded rectangles with line icons would be the one
 * place on the page where the product forgot what it was. The medium is the
 * argument here.
 *
 * ## Why the tilts are hand-set and not random
 *
 * A random rotation per render means the wall re-arranges itself on every
 * navigation, which reads as instability rather than as texture — and a
 * genuinely random set reliably produces two adjacent notes at the same angle,
 * which looks like a mistake. Six fixed angles, none of them repeating beside
 * each other, and the arrangement is the same every time somebody comes back.
 *
 * The values are small. A note at fifteen degrees is a graphic; one at three
 * is a piece of paper somebody put down in a hurry.
 */
const NOTES: {
  key: TranslationKey;
  body: TranslationKey;
  colour: string;
  tilt: number;
}[] = [
  { key: 'landing.note.boards', body: 'landing.note.boardsBody', colour: '#fde68a', tilt: -2.5 },
  { key: 'landing.note.notes', body: 'landing.note.notesBody', colour: '#bfdbfe', tilt: 1.8 },
  { key: 'landing.note.meetings', body: 'landing.note.meetingsBody', colour: '#bbf7d0', tilt: -1.2 },
  { key: 'landing.note.docs', body: 'landing.note.docsBody', colour: '#fbcfe8', tilt: 2.4 },
  { key: 'landing.note.undo', body: 'landing.note.undoBody', colour: '#ddd6fe', tilt: -1.9 },
  { key: 'landing.note.skins', body: 'landing.note.skinsBody', colour: '#fed7aa', tilt: 1.4 },
];

/** The wall. */
export const FeatureNotes = () => {
  const t = useT();
  const reduceMotion = useReducedMotion();

  return (
    <ul className="grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
      {NOTES.map((note, index) => (
        <motion.li
          key={note.key}
          initial={reduceMotion ? false : { opacity: 0, y: 24, rotate: 0 }}
          whileInView={{ opacity: 1, y: 0, rotate: note.tilt }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 22,
            delay: Math.min(index * 0.06, 0.35),
          }}
          /*
           * Straightens under the pointer. The gesture the whole app is built
           * on is picking paper up, and a note that lifts and squares itself
           * when you look at it is that gesture at rest — one line of CSS
           * doing what a paragraph of copy about "tactile interfaces" would
           * do worse.
           */
          whileHover={reduceMotion ? undefined : { rotate: 0, y: -6, scale: 1.02 }}
          className="gpu relative"
          style={{ rotate: reduceMotion ? 0 : undefined }}
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
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#1a1a22]/75">
              {t(note.body)}
            </p>
          </div>
        </motion.li>
      ))}
    </ul>
  );
};
