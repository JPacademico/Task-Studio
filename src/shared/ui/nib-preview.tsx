import { useEffect, useState, type RefObject } from 'react';

import { cn } from '@/shared/lib/cn';

/**
 * How small the ring is ever drawn, whatever the nib is set to.
 *
 * A 1px pen would otherwise produce a 1px ring, which is a dot — indistinguish-
 * able from a rendering artefact and useless as a preview. Below this the ring
 * stops shrinking and the nib is understood to be "as fine as it goes".
 */
const MIN_DIAMETER = 6;

/**
 * The widest the ring is ever drawn in the toolbar, in CSS pixels.
 *
 * The preview box is a fixed `1.75rem` square so the toolbar row cannot jump a
 * pixel taller every time somebody nudges the size; this is that box's inner
 * diameter, one pixel clear of its edge on each side.
 */
const BOX_DIAMETER = 24;

/**
 * The ring's diameter for a nib of `size`, given the range the control offers.
 *
 * ## Why a range and not just the size
 *
 * Because the rubber goes to seventy. Drawing the ring at its true size worked
 * only for as long as every tool that used this was a pen: the ink width tops
 * out at 12 and 18 on the two boards, both comfortably inside the 24px box. The
 * eraser's slider runs 10–70, so at anything past a third of the way along, the
 * ring was drawn larger than the box that was supposed to contain it — and
 * since the box is a `grid` with no clipping, the circle simply grew straight
 * out of it, over the divider, over the toolbar's own bottom edge, and pushed
 * the row's baseline down as it went. A size control that visibly breaks the
 * bar it lives in reads as a rendering fault, not as a preview.
 *
 * ## Why it scales rather than clamps
 *
 * Clamping at 24 would stop the overflow and cost the control its only piece of
 * feedback: every eraser from 24 to 70 would draw an identical ring, so two
 * thirds of the slider's travel would do nothing visible. Mapping the slider's
 * whole range onto the box keeps every step of it legible.
 *
 * ## Why true size is kept where it fits
 *
 * A ring the size of the mark is strictly better information than a ring
 * proportional to it, so the scaling only starts when the range demands it. A
 * control whose maximum already fits the box is drawn life-size exactly as
 * before — which is every pen in the app, so nothing about the ink preview
 * changes.
 *
 * The true size is never lost for the rubber either: `NibCursor` draws the same
 * ring on the canvas at its real diameter, which is where the question "how big
 * a mark will this leave" is actually asked.
 */
const ringDiameter = (size: number, min: number, max: number): number => {
  if (max <= BOX_DIAMETER) return Math.max(MIN_DIAMETER, size);

  const span = Math.max(1, max - min);
  const along = Math.min(1, Math.max(0, (size - min) / span));

  return MIN_DIAMETER + along * (BOX_DIAMETER - MIN_DIAMETER);
};

/**
 * The size a pen or a rubber is about to draw at, as a dotted circle.
 *
 * ## Why a ring and not a number
 *
 * Because "8" is not a size. Every drawing tool ever made shows the nib as a
 * circle for the same reason: the only question the user is asking is "how big
 * a mark will this leave", and a circle the size of the mark answers it without
 * a unit, a mental conversion, or a trial stroke that then has to be undone.
 * The board had a stepper reading `8px` and no way to find out what 8px looked
 * like except to draw with it.
 *
 * ## Why dotted rather than solid
 *
 * A solid circle of the ink colour *is* a mark, and one sitting on the canvas
 * under the pointer is indistinguishable from something already drawn. Dots say
 * "this is a guide" in a way no amount of transparency does, and they stay
 * legible over a dark note, a light note and a photograph without the ring
 * needing to know what is underneath it.
 */
export const NibPreview = ({
  size,
  color,
  min = 1,
  max = BOX_DIAMETER,
  className,
}: {
  /** The stroke width the tool will draw at, in CSS pixels. */
  size: number;
  /** The ink. Omitted for a rubber, which has no colour to preview. */
  color?: string;
  /**
   * The ends of the slider this is previewing.
   *
   * Only consulted when `max` is wider than the box — see `ringDiameter`. The
   * defaults describe a control that fits life-size, which is what every caller
   * that passes neither is.
   */
  min?: number;
  max?: number;
  className?: string;
}) => {
  const diameter = ringDiameter(size, min, max);

  return (
    <span
      aria-hidden
      className={cn('grid shrink-0 place-items-center overflow-hidden', className)}
      /* A fixed box, so a stepper's row does not jump a pixel taller every time
         somebody nudges the size up. The ring grows inside it — `ringDiameter`
         is what guarantees it stays there, and `overflow-hidden` is the belt to
         its braces: a future caller with a wider range than anyone anticipated
         gets a clipped ring rather than a broken toolbar. */
      style={{ width: '1.75rem', height: '1.75rem' }}
    >
      <span
        className="rounded-full border border-dashed"
        style={{
          width: diameter,
          height: diameter,
          borderColor: color ?? 'currentColor',
          // The ring's own outline stays hairline whatever the nib is doing:
          // scaling it with the size would make a large nib read as a thick
          // doughnut rather than as a large circle.
          borderWidth: 1,
          backgroundColor: color ? `${color}22` : 'transparent',
        }}
      />
    </span>
  );
};

/**
 * The same ring, following the pointer across the canvas.
 *
 * ## Why this is not `cursor: url(...)`
 *
 * A custom cursor image is capped at 128px by every browser and, more
 * awkwardly, has to be a *static file* — so a nib that changes size and colour
 * would need one image per combination, generated ahead of time. A rendered
 * element has neither limit and costs one `transform` per pointer move.
 *
 * ## Why the position is written straight to the node
 *
 * Because this moves on every `pointermove`, and putting that in React state
 * would re-render the board — several hundred notes — at pointer frequency. The
 * ring is positioned by mutating its own style, which touches one element and
 * stays on the compositor.
 */
export const NibCursor = ({
  surface,
  size,
  color,
  isActive,
}: {
  /** The element the ring is tracked across. */
  surface: RefObject<HTMLElement | null>;
  size: number;
  color?: string;
  isActive: boolean;
}) => {
  const [node, setNode] = useState<HTMLSpanElement | null>(null);

  useEffect(() => {
    const host = surface.current;
    if (!host || !node || !isActive) return;

    // Hidden until the pointer is actually over the canvas, so the ring does
    // not sit frozen in a corner from the last time the tool was used.
    node.style.opacity = '0';

    const move = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      node.style.opacity = '1';
      node.style.transform = `translate3d(${event.clientX - rect.left}px, ${
        event.clientY - rect.top
      }px, 0) translate(-50%, -50%)`;
    };

    const leave = () => {
      node.style.opacity = '0';
    };

    host.addEventListener('pointermove', move);
    host.addEventListener('pointerleave', leave);
    return () => {
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerleave', leave);
    };
  }, [surface, node, isActive]);

  if (!isActive) return null;

  const diameter = Math.max(MIN_DIAMETER, size);

  return (
    <span
      ref={setNode}
      aria-hidden
      /* `z-40` puts it over the ink layer (z-30) and under the toolbar. It never
         takes the pointer — the layer underneath is the thing being drawn on. */
      className="pointer-events-none absolute left-0 top-0 z-40 rounded-full border border-dashed opacity-0 transition-opacity duration-100"
      style={{
        width: diameter,
        height: diameter,
        borderWidth: 1,
        borderColor: color ?? 'rgb(var(--content) / 0.7)',
        backgroundColor: color ? `${color}1f` : 'rgb(var(--content) / 0.08)',
        // A second ring in the opposite tone, so the guide is visible on a
        // yellow Post-it and on a dark board without measuring either.
        boxShadow: '0 0 0 1px rgb(255 255 255 / 0.55), inset 0 0 0 1px rgb(0 0 0 / 0.35)',
      }}
    />
  );
};
