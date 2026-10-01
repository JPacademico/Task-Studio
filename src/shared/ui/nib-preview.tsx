import { useEffect, useState, type RefObject } from 'react';

import { cn } from '@/shared/lib/cn';

/**
 * How small the ring is ever drawn, whatever the nib is set to. A 1px pen would otherwise produce a
 * 1px ring, which is a dot.
 */
const MIN_DIAMETER = 6;

/** The widest the ring is ever drawn in the toolbar, in CSS pixels. */
const BOX_DIAMETER = 24;

/** The ring's diameter for a nib of `size`, given the range the control offers. */
const ringDiameter = (size: number, min: number, max: number): number => {
  if (max <= BOX_DIAMETER) return Math.max(MIN_DIAMETER, size);

  const span = Math.max(1, max - min);
  const along = Math.min(1, Math.max(0, (size - min) / span));

  return MIN_DIAMETER + along * (BOX_DIAMETER - MIN_DIAMETER);
};

/** The size a pen or a rubber is about to draw at, as a dotted circle. */
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
   * The ends of the slider this is previewing. Only consulted when `max` is wider than the box —
   * see `ringDiameter`.
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
      /* A fixed box, so a stepper's row does not jump a pixel taller every time somebody nudges the
         size up. */
      style={{ width: '1.75rem', height: '1.75rem' }}
    >
      <span
        className="rounded-full border border-dashed"
        style={{
          width: diameter,
          height: diameter,
          borderColor: color ?? 'currentColor',
          // The ring's own outline stays hairline whatever the nib is doing: scaling it with the
          // size would make a large nib read as a thick doughnut rather than as a large circle.
          borderWidth: 1,
          backgroundColor: color ? `${color}22` : 'transparent',
        }}
      />
    </span>
  );
};

/**
 * The same ring, following the pointer across the canvas. A custom cursor image is capped at 128px
 * by every browser and, more awkwardly, has to be a *static file*.
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
