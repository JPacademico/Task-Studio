import { createPortal } from 'react-dom';
import { Pin, type LucideIcon } from 'lucide-react';

interface TearOffGhostProps {
  /** Pointer position, or null when no gesture is in flight. */
  point: { x: number; y: number } | null;
  label: string;
  icon: LucideIcon;
  color?: string;
}

/**
 * What the pointer is carrying while a menu entry is being pulled out.
 *
 * Portalled to the body and positioned in viewport coordinates so it is never
 * clipped by the rail's scroll container — which is the whole reason the rows
 * themselves stay put during the gesture.
 */
export const TearOffGhost = ({ point, label, icon: Icon, color }: TearOffGhostProps) => {
  if (!point) return null;

  return createPortal(
    <div
      aria-hidden
      style={{ left: point.x, top: point.y }}
      className="pointer-events-none fixed z-[90] -translate-x-1/2 -translate-y-1/2"
    >
      <div className="flex -rotate-2 items-center gap-2 rounded-2xl border border-brand/50 bg-surface-raised/95 px-3 py-2 shadow-[0_20px_40px_-18px_rgb(0_0_0/0.8)] backdrop-blur-xl">
        <span
          className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-brand/15 text-brand"
          style={color ? { backgroundColor: `${color}26`, color } : undefined}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="max-w-[9rem] truncate text-xs font-semibold">{label}</span>
      </div>

      <p className="mt-1.5 flex items-center justify-center gap-1 text-3xs font-semibold uppercase tracking-[0.14em] text-brand">
        <Pin className="h-2.5 w-2.5" />
        Drop to pin
      </p>
    </div>,
    document.body,
  );
};
