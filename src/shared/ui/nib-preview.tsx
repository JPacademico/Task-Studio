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
  className,
}: {
  /** The stroke width the tool will draw at, in CSS pixels. */
  size: number;
  /** The ink. Omitted for a rubber, which has no colour to preview. */
  color?: string;
  className?: string;
}) => {
  const diameter = Math.max(MIN_DIAMETER, size);

  return (
    <span
      aria-hidden
      className={cn('grid shrink-0 place-items-center', className)}
      /* A fixed box, so a stepper's row does not jump a pixel taller every time
         somebody nudges the size up. The ring grows inside it. */
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
