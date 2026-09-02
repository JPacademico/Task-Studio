import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2 } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { translate, useT } from '@/shared/i18n';

interface ExpandToggleProps {
  isExpanded: boolean;
  onToggle: () => void;
  className?: string;
  /** Shown next to the glyph from `sm` up. */
  label?: string;
}

/**
 * Takes a canvas to the whole screen and back.
 *
 * Drawn as a framed corner-bracket rather than a plain icon button: it is the
 * one control that changes the size of the surface you are working on, so it
 * should read as a window chrome affordance and not as another tool.
 */
export const ExpandToggle = ({ isExpanded, onToggle, className, label }: ExpandToggleProps) => (
  <button
    type="button"
    onClick={onToggle}
    aria-pressed={isExpanded}
    title={translate(isExpanded ? 'stage.collapse' : 'stage.expand')}
    aria-label={isExpanded ? 'Collapse the board' : 'Expand the board to full screen'}
    className={cn(
      'ui-filter group/expand relative inline-flex h-8 items-center gap-1.5 overflow-hidden rounded-xl border px-2.5',
      'text-xs font-medium transition-colors duration-150 ease-studio',
      isExpanded
        ? 'border-brand bg-brand/15 text-brand'
        : 'border-edge text-content-muted hover:border-brand/50 hover:bg-brand/[0.07] hover:text-brand',
      className,
    )}
  >
    {/* Corner brackets that push outwards on hover — the gesture, drawn. */}
    <span aria-hidden className="relative grid h-3.5 w-3.5 place-items-center">
      {isExpanded ? (
        <Minimize2 className="h-3.5 w-3.5 transition-transform duration-150 group-hover/expand:scale-90" />
      ) : (
        <Maximize2 className="h-3.5 w-3.5 transition-transform duration-150 group-hover/expand:scale-110" />
      )}
    </span>
    {label && <span className="hidden sm:inline">{label}</span>}
  </button>
);

interface ExpandableStageProps {
  isExpanded: boolean;
  onCollapse: () => void;
  /** Shown in the full-screen header, so the surface still says what it is. */
  title: string;
  /** Controls that belong beside the title once expanded (a page switcher…). */
  actions?: ReactNode;
  children: ReactNode;
  /** Applied to the inline (non-expanded) wrapper only. */
  className?: string;
  /**
   * Fired every time the children actually move between the page and the
   * full-screen portal.
   *
   * The move remounts the subtree, so anything holding a DOM node inside it —
   * the whiteboard's `<canvas>`, which is sized and painted imperatively — has
   * to re-run its setup against the new element.
   */
  onSurfaceRemount?: () => void;
}

/**
 * A surface that can take over the screen.
 *
 * Expanded, the children are portalled to `document.body`: a fixed overlay
 * mounted inside the page would be positioned against the route wrapper — that
 * element is composited (`transform: translateZ(0)`) and therefore becomes the
 * containing block for anything fixed inside it, which quietly turns "full
 * screen" into "as big as the content column".
 *
 * The swap is deliberately instant. Growing and shrinking a whole board used to
 * be animated on the skin's stage curve, but on a surface the user is arranging
 * by hand the transition read as lag rather than as continuity — every trip to
 * full screen and back put a few hundred milliseconds of scaling paper between
 * the click and the work. A hard cut also means the children live in exactly
 * one host at a time, so there is no window where a collapsing canvas is still
 * painting in the portal while its replacement mounts in the page.
 */
export const ExpandableStage = ({
  isExpanded,
  onCollapse,
  title,
  actions,
  children,
  className,
  onSurfaceRemount,
}: ExpandableStageProps) => {
  const t = useT();
  const remountRef = useRef(onSurfaceRemount);
  remountRef.current = onSurfaceRemount;

  // Every swap of the host element is a remount of the subtree. Read through a
  // ref so a caller passing an inline arrow does not fire this on every render.
  useEffect(() => remountRef.current?.(), [isExpanded]);

  // A full-screen canvas behind a scrolling page is how you lose your place.
  useEffect(() => {
    if (!isExpanded) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isExpanded]);

  // Escape leaves the stage. Registered in the capture phase so it runs before
  // the board's own Escape handler and the two never fight over one key press.
  useEffect(() => {
    if (!isExpanded) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onCollapse();
    };

    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [isExpanded, onCollapse]);

  if (!isExpanded) return <div className={cn('space-y-3', className)}>{children}</div>;

  return createPortal(
    <section
      className={cn(
        'fixed inset-0 z-[80] flex flex-col gap-2.5 bg-surface p-3 sm:gap-3 sm:p-4',
        // Edge to edge means under the notch and the home indicator too.
        'safe-t safe-b safe-l safe-r',
      )}
    >
      {/* No collapse control of its own: the surface's own toolbar carries the
          shrink toggle, and two buttons for one gesture is one too many. */}
      <header className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="min-w-0">
          <p className="text-3xs uppercase tracking-[0.18em] text-content-faint">{t('common.fullScreen')}</p>
          <h2 className="truncate text-sm font-semibold tracking-tight sm:text-base">{title}</h2>
        </div>

        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </header>

      {/* min-h-0 is what lets the board actually take the remaining height
          instead of overflowing the flex column. */}
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 sm:gap-3">{children}</div>
    </section>,
    document.body,
  );
};
