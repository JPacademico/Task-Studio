import type { ComponentType } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { useSkin } from '@/app/providers/theme-provider';
import type { ThemeSkin } from '@/entities/user/model/types';
import { cn } from '@/shared/lib/cn';
import { HazardMark } from './hazard-icons';
import { NewspaperMark } from './newspaper-icons';
import { SpaceMark } from './space-icons';

/**
 * Hand-drawn stationery icons.
 *
 * These are objects the user manipulates — a pin they push into a menu, a note
 * somebody stuck on their task — so they are drawn as small illustrations with
 * their own motion rather than borrowed from the generic line-icon set.
 *
 * Two skins redraw these objects rather than restyle them, because a skin that
 * only recolours its icons is a skin you stop noticing:
 *
 *   - The arcade gets sprites. A pixel drawing is not a smooth shape with the
 *     anti-aliasing turned off — nothing is a curve, a peeled corner is a
 *     staircase, and a highlight is one lit square. See `PixelPaper`.
 *   - The deep field gets instruments. Nothing in orbit is made of paper that
 *     curls, so the sheet becomes a lit panel with a plasma rim and a clipped
 *     bevel. See `SlatePaper`.
 */

interface PushPinProps {
  isPinned: boolean;
  className?: string;
}

/**
 * A push pin that drives itself into the surface when engaged: the needle
 * shortens, the head tilts upright and a shadow lands underneath it.
 */
export const PushPin = ({ isPinned, className }: PushPinProps) => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn('h-4 w-4', className)}
      initial={false}
      animate={{ rotate: isPinned ? 0 : -32, y: isPinned ? 0 : -1 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: 'spring', stiffness: 500, damping: 18, mass: 0.5 }
      }
    >
      {/* Needle */}
      <motion.line
        x1="12"
        y1="14"
        x2="12"
        y2="21.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        initial={false}
        animate={{ opacity: isPinned ? 1 : 0.55 }}
      />
      {/* Body */}
      <path
        d="M8.4 4.2a1.4 1.4 0 0 1 1.32-.95h4.56a1.4 1.4 0 0 1 1.32 1.85l-.86 2.5 1.9 2.36a1.5 1.5 0 0 1-1.17 2.44H8.53a1.5 1.5 0 0 1-1.17-2.44l1.9-2.36-.86-2.5a1.4 1.4 0 0 1-.01-.9Z"
        fill="currentColor"
        fillOpacity={isPinned ? 1 : 0.28}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* Contact shadow, only once it is actually driven in. */}
      <motion.ellipse
        cx="12"
        cy="21.6"
        rx="3.4"
        ry="0.9"
        fill="currentColor"
        initial={false}
        animate={{ opacity: isPinned ? 0.25 : 0, scaleX: isPinned ? 1 : 0.4 }}
        style={{ transformOrigin: '12px 21.6px' }}
      />
    </motion.svg>
  );
};

/**
 * The arcade's own square of paper: a 16×16 sprite, staircase peel, one lit
 * square where the smooth version has a highlight.
 */
const PixelPaper = ({ count }: { count?: number }) => (
  <g shapeRendering="crispEdges">
    {/* Body. */}
    <rect x="3" y="3" width="18" height="15" fill="currentColor" fillOpacity="0.92" />
    {/* Staircase peel out of the bottom-right corner. */}
    <rect x="15" y="15" width="6" height="3" fill="rgb(var(--surface))" />
    <rect x="18" y="12" width="3" height="3" fill="rgb(var(--surface))" />
    <rect x="15" y="15" width="3" height="3" fill="currentColor" fillOpacity="0.45" />
    {/* Top-left lit square. */}
    <rect x="3" y="3" width="3" height="3" fill="currentColor" fillOpacity="0.55" />

    {count === undefined || count > 9 ? (
      <g fill="rgb(var(--surface-raised))">
        <rect x="6" y="7" width="12" height="2" />
        <rect x="6" y="11" width="8" height="2" />
      </g>
    ) : (
      <text
        x="12"
        y="14"
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fill="rgb(var(--surface-raised))"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {count}
      </text>
    )}
  </g>
);

/**
 * The deep field's square of paper: a hard-light data slate.
 *
 * Same object, different world — the sheet is a lit panel with a plasma edge
 * and the peeled corner becomes a clipped bevel, because nothing in orbit is
 * made of paper that curls.
 */
const SlatePaper = ({ count }: { count?: number }) => (
  <>
    <path
      d="M4 3.6h16v10.6L14.4 20H4V3.6Z"
      fill="currentColor"
      fillOpacity="0.88"
      stroke="currentColor"
      strokeOpacity="0.5"
      strokeWidth="1"
      strokeLinejoin="round"
    />
    {/* Plasma edge along the top — the lit rim the whole skin is built on. */}
    <path d="M4.8 5.2h14.4" stroke="rgb(var(--space-plasma))" strokeWidth="1.4" opacity="0.9" />
    {/* The clipped corner, with its own beam. */}
    <path
      d="M14.4 20v-5.8H20"
      fill="none"
      stroke="rgb(var(--space-flare))"
      strokeOpacity="0.8"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />

    {count === undefined || count > 9 ? (
      <g stroke="rgb(var(--surface-raised))" strokeWidth="1.2" strokeLinecap="round">
        <line x1="7" y1="9.2" x2="17" y2="9.2" />
        <line x1="7" y1="12.4" x2="14.6" y2="12.4" />
      </g>
    ) : (
      <text
        x="12"
        y="14.2"
        textAnchor="middle"
        fontSize="9"
        fontWeight="700"
        fill="rgb(var(--surface-raised))"
      >
        {count}
      </text>
    )}
  </>
);

/**
 * The containment site's square of paper: a specimen label.
 *
 * Nothing gets stuck to anything here without being logged first, so the sheet
 * is a rectangular tag with a taped header bar and a hard border — no curl, no
 * tilt, and the count reads as a sample number rather than as a note count.
 */
const LabelPaper = ({ count }: { count?: number }) => (
  <>
    <rect
      x="3.6"
      y="4"
      width="16.8"
      height="16"
      fill="currentColor"
      fillOpacity="0.9"
      stroke="currentColor"
      strokeWidth="1.4"
    />
    {/* The tape across the header. */}
    <rect x="3.6" y="4" width="16.8" height="3.4" fill="rgb(var(--hazard-sludge))" opacity="0.85" />

    {count === undefined || count > 9 ? (
      <g stroke="rgb(var(--surface-raised))" strokeWidth="1.5" strokeLinecap="butt">
        <line x1="6.4" y1="11.4" x2="17.6" y2="11.4" />
        <line x1="6.4" y1="15" x2="14" y2="15" />
      </g>
    ) : (
      <text
        x="12"
        y="16.4"
        textAnchor="middle"
        fontSize="9.5"
        fontWeight="800"
        fill="rgb(var(--surface-raised))"
      >
        {count}
      </text>
    )}
  </>
);

/**
 * The newsroom's square of paper: a clipping.
 *
 * Cut out of the edition and kept — so the outline is a scissor line, the top
 * bar is a headline rather than a rule, and the body is set in two columns
 * because that is how the story it came from was set.
 */
const ClippingPaper = ({ count }: { count?: number }) => (
  <>
    <path
      d="M4 4h16v12.6L15.2 20H4V4Z"
      fill="currentColor"
      fillOpacity="0.9"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeDasharray="2.2 1.5"
      strokeLinejoin="round"
    />
    {/* The headline. */}
    <rect x="6.2" y="6.2" width="11.6" height="2.2" fill="rgb(var(--surface-raised))" />

    {count === undefined || count > 9 ? (
      <g stroke="rgb(var(--surface-raised))" strokeWidth="1.2" strokeLinecap="butt" opacity="0.85">
        <line x1="6.2" y1="11.4" x2="11.2" y2="11.4" />
        <line x1="6.2" y1="14.2" x2="11.2" y2="14.2" />
        <line x1="12.8" y1="11.4" x2="17.8" y2="11.4" />
        <line x1="12.8" y1="14.2" x2="17.8" y2="14.2" />
      </g>
    ) : (
      <text
        x="12"
        y="15.6"
        textAnchor="middle"
        fontSize="9"
        fontWeight="900"
        fill="rgb(var(--surface-raised))"
      >
        {count}
      </text>
    )}
  </>
);

/** The smooth square of paper: curves, a soft peel, hairline outlines. */
const DrawnPaper = ({ count }: { count?: number }) => (
  <>
    {/* Paper — the notch in the bottom-right is where the corner peels up. */}
    <path
      d="M4 3.6h16v11.2L14.8 20H4V3.6Z"
      fill="currentColor"
      fillOpacity="0.9"
      stroke="currentColor"
      strokeOpacity="0.55"
      strokeWidth="1.1"
      strokeLinejoin="round"
    />
    {/* Curled corner. */}
    <path
      d="M14.8 20v-5.2H20L14.8 20Z"
      fill="currentColor"
      fillOpacity="0.45"
      stroke="currentColor"
      strokeOpacity="0.55"
      strokeWidth="1.1"
      strokeLinejoin="round"
    />
    {count === undefined || count > 9 ? (
      // Ruled lines stand in for the text when there is no number to show.
      <g stroke="rgb(var(--surface-raised))" strokeWidth="1.2" strokeLinecap="round">
        <line x1="7" y1="8" x2="17" y2="8" />
        <line x1="7" y1="11.4" x2="15" y2="11.4" />
      </g>
    ) : (
      <text
        x="12"
        y="13.6"
        textAnchor="middle"
        fontSize="9"
        fontWeight="700"
        fill="rgb(var(--surface-raised))"
      >
        {count}
      </text>
    )}
  </>
);

/**
 * "Send", drawn as whatever sending is in the active skin.
 *
 * In the deep field that is a launch, so the paper plane becomes a rocket with
 * its engine lit — the one place the space skin gets to put an actual vehicle
 * on screen, and the only button in the app whose verb is already the same
 * word. Everywhere else it stays the plane the rest of the icon set uses.
 */
export const SendGlyph = ({ className }: { className?: string }) => {
  const isSpace = useSkin() === 'SPACE';

  if (!isSpace) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden className={cn('h-3.5 w-3.5', className)}>
        <path
          d="M3.4 11.3 20 4l-7.3 16.6-2.1-6.6-7.2-2.7Z"
          fill="currentColor"
          fillOpacity="0.18"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M20 4l-9.3 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={cn('h-3.5 w-3.5', className)}>
      {/* Fuselage, nose up. */}
      <path
        d="M12 2.2c2.6 2.3 4 5.5 4 8.9v3.3l-1.9 1.6h-4.2L8 14.4v-3.3c0-3.4 1.4-6.6 4-8.9Z"
        fill="currentColor"
        fillOpacity="0.9"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      {/* Porthole. */}
      <circle cx="12" cy="9" r="1.6" fill="rgb(var(--space-plasma))" />
      {/* Fins. */}
      <path
        d="M8 11.6 5.4 14.6v2.4L8 15.4Zm8 0 2.6 3v2.4L16 15.4Z"
        fill="currentColor"
        fillOpacity="0.6"
      />
      {/* Exhaust. */}
      <path
        d="M10.6 17.6h2.8l-1.4 4.2-1.4-4.2Z"
        fill="rgb(var(--space-flare))"
        fillOpacity="0.9"
      />
    </svg>
  );
};

/**
 * Which drawing of "a square of paper" each skin uses.
 *
 * Anything not listed keeps the drawn one — a skin earns its own object by
 * having a world where the drawn one would be wrong, not by existing.
 */
const PAPERS: Partial<Record<ThemeSkin, ComponentType<{ count?: number }>>> = {
  PIXEL: PixelPaper,
  SPACE: SlatePaper,
  HAZARD: LabelPaper,
  NEWSPAPER: ClippingPaper,
};

const paperFor = (skin: ThemeSkin) => PAPERS[skin] ?? DrawnPaper;

/**
 * Paper that does not move.
 *
 * A sprite does not flutter, a hard-light panel does not curl, and a label
 * taped to a drum is not going anywhere — so those three skins lose the breeze
 * and the tilt. A newsprint clipping keeps both: it is still paper.
 */
const isRigidPaper = (skin: ThemeSkin): boolean =>
  skin === 'PIXEL' || skin === 'SPACE' || skin === 'HAZARD';

interface PostItMarkProps {
  /** How many notes are attached — shown on the paper itself when it fits. */
  count?: number;
  className?: string;
  /** Larger, slower flutter for empty-state and header use. */
  size?: 'sm' | 'md';
}

/**
 * A small square of paper with a curled corner, tilted and gently fluttering,
 * used to mark a task somebody has attached notes to.
 *
 * The flutter is a CSS animation, not a Framer keyframe loop. This glyph is
 * rendered once per task with notes, so a list of two hundred was holding two
 * hundred JavaScript-driven animations open forever — each with its own frame
 * callback and React subscription. As a compositor animation the same list
 * costs the main thread nothing at all.
 */
export const PostItMark = ({ count, className, size = 'sm' }: PostItMarkProps) => {
  const reduceMotion = useReducedMotion();
  const skin = useSkin();
  const Paper = paperFor(skin);

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn(
        size === 'sm' ? 'h-4 w-4' : 'h-6 w-6',
        'origin-center transition-transform duration-150 hover:scale-110',
        // Only the skins made of actual paper get the breeze.
        !reduceMotion && !isRigidPaper(skin) && 'flutter',
        className,
      )}
    >
      <Paper count={count} />
    </svg>
  );
};

/**
 * The same square of paper without the flutter, for buttons and toolbars where
 * a permanently animating glyph would be noise.
 */
export const PostItGlyph = ({ className }: { className?: string }) => {
  const skin = useSkin();
  const Paper = paperFor(skin);

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn('h-4 w-4', className)}
      // A sprite is never off-grid, an instrument panel is never crooked and a
      // logged specimen is never at an angle; the rest are tilted.
      style={isRigidPaper(skin) ? undefined : { transform: 'rotate(-4deg)' }}
    >
      <Paper />
    </svg>
  );
};

interface StudioMarkProps {
  className?: string;
  /** Lifts and straightens on hover — used where the mark is also a link. */
  interactive?: boolean;
}

/**
 * The product mark: a Post-it with a pin through it.
 *
 * This replaces the generic "T" tile that used to sit in the sidebar, the top
 * bar and the auth screen. A workspace built out of paper objects should not
 * introduce itself with a letter in a rounded square.
 *
 * Two skins introduce themselves as something else entirely, for the same
 * reason: a square of paper is not a thing the arcade or the deep field has.
 */
export const StudioMark = ({ className, interactive = false }: StudioMarkProps) => {
  const reduceMotion = useReducedMotion();
  const skin = useSkin();
  const isPixel = skin === 'PIXEL';

  // Three skins draw the object themselves: a note among stars, a placard on a
  // containment door, a masthead on page one. All three are the same gesture —
  // a lift under the pointer — so they share one wrapper rather than three.
  const Drawn =
    skin === 'SPACE'
      ? SpaceMark
      : skin === 'HAZARD'
        ? HazardMark
        : skin === 'NEWSPAPER'
          ? NewspaperMark
          : null;

  if (Drawn) {
    return (
      <motion.span
        className={cn('block', className)}
        initial={false}
        whileHover={interactive && !reduceMotion ? { scale: 1.06, rotate: -4 } : undefined}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <Drawn className="h-full w-full" />
      </motion.span>
    );
  }

  // The arcade's mark is the same object built out of squares, and it never
  // sits off the grid — a tilted sprite is a sprite drawn wrong.
  if (isPixel) {
    return (
      <motion.svg
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden
        shapeRendering="crispEdges"
        className={cn('h-10 w-10', className)}
        initial={false}
        whileHover={interactive && !reduceMotion ? { scale: 1.08 } : undefined}
        transition={{ duration: 0.12, ease: (progress: number) => Math.ceil(progress * 3) / 3 }}
      >
        {/* The pad behind. */}
        <rect x="10" y="10" width="26" height="26" fill="currentColor" fillOpacity="0.25" />

        {/* The paper. */}
        <rect x="4" y="4" width="28" height="28" fill="currentColor" />
        {/* Staircase peel. */}
        <rect x="24" y="28" width="8" height="4" fill="rgb(var(--surface))" />
        <rect x="28" y="24" width="4" height="4" fill="rgb(var(--surface))" />
        <rect x="24" y="24" width="4" height="4" fill="currentColor" fillOpacity="0.5" />

        {/* Two written lines. */}
        <g fill="rgb(var(--surface-raised))" fillOpacity="0.9">
          <rect x="9" y="12" width="18" height="3" />
          <rect x="9" y="19" width="12" height="3" />
        </g>

        {/* The pin, pushed through the corner. */}
        <rect x="4" y="4" width="8" height="8" fill="rgb(var(--surface-raised))" />
        <rect x="6" y="6" width="4" height="4" fill="currentColor" />
      </motion.svg>
    );
  }

  return (
    <motion.svg
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden
      className={cn('h-10 w-10', className)}
      initial={false}
      whileHover={interactive && !reduceMotion ? { rotate: 0, scale: 1.06 } : undefined}
      animate={{ rotate: -3 }}
      transition={{ type: 'spring', stiffness: 320, damping: 20 }}
      style={{ transformOrigin: '20px 20px' }}
    >
      {/* The sheet behind, so the mark reads as a pad and not a single square. */}
      <rect
        x="7"
        y="8"
        width="26"
        height="26"
        rx="3"
        fill="currentColor"
        fillOpacity="0.22"
        transform="rotate(6 20 20)"
      />

      {/* The paper. */}
      <path
        d="M6 6.5h27v20.2L25.4 34H6V6.5Z"
        fill="currentColor"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Peeled corner. */}
      <path
        d="M25.4 34v-7.3H33L25.4 34Z"
        fill="rgb(var(--surface-raised))"
        fillOpacity="0.55"
        stroke="currentColor"
        strokeOpacity="0.3"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Two written lines. */}
      <g
        stroke="rgb(var(--surface-raised))"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeOpacity="0.85"
      >
        <line x1="11.5" y1="14.5" x2="27" y2="14.5" />
        <line x1="11.5" y1="20.5" x2="22" y2="20.5" />
      </g>

      {/* The pin head, pushed through the top-left corner. */}
      <circle
        cx="9.5"
        cy="9"
        r="3.4"
        fill="rgb(var(--surface-raised))"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </motion.svg>
  );
};

/**
 * A stack of pages, used by the board pager. The top sheet lifts on hover so
 * "add page" reads as adding to a physical pile.
 */
export const PageStack = ({ className }: { className?: string }) => {
  const isPixel = useSkin() === 'PIXEL';

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      shapeRendering={isPixel ? 'crispEdges' : undefined}
      className={cn('h-4 w-4', className)}
    >
      <rect
        x="3"
        y="6"
        width="13"
        height="15"
        rx={isPixel ? 0 : 2}
        fill="currentColor"
        fillOpacity="0.25"
      />
      <rect
        x="7"
        y="3"
        width="14"
        height="15"
        rx={isPixel ? 0 : 2}
        fill="currentColor"
        fillOpacity="0.9"
        stroke="currentColor"
        strokeWidth={isPixel ? 2 : 1.2}
      />
    </svg>
  );
};
