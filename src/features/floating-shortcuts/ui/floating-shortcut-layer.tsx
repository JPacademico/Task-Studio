import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValue } from 'framer-motion';
import { GripVertical, Undo2 } from 'lucide-react';

import { useT } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { useIsTouchDevice } from '@/shared/lib/hooks';
import { NavGlyph } from '@/shared/ui';
import { clampToViewport, useFloatingShortcuts, type FloatingShortcut } from '../model/shortcuts.store';
import { iconFor } from './shortcut-icon';

/**
 * Where a pill sits in the app's stacking order.
 *
 * Named because these two numbers only make sense against the chrome they are
 * chosen relative to: the top bar is 40 and both side rails are 50.
 *
 * Resting used to be 30, which put a pill under everything — including the top
 * bar, which is a strip the user can perfectly well drop a pill onto. Doing so
 * made it disappear: it was still there, still clickable at the edges, but the
 * bar was painted over it the moment the bar was revealed, so the pill looked
 * lost. 45 sits above the top bar and below the side rails, which keeps the
 * original intent where it actually applied — a 260px rail sliding out passes
 * over its own shortcuts rather than fighting them for the same strip of
 * screen — while a pill parked in the header stays visible.
 */
const RESTING_Z = 45;
const DRAGGING_Z = 70;

/**
 * One pinned menu entry, sitting wherever the user dropped it.
 *
 * `left`/`top` come from the store and the drag runs on motion values, so
 * moving a pill never re-renders anything until the gesture ends — and the
 * transform is zeroed on release, when the stored coordinates take over.
 */
const ShortcutPill = ({ shortcut }: { shortcut: FloatingShortcut }) => {
  const t = useT();
  const move = useFloatingShortcuts((state) => state.move);
  const remove = useFloatingShortcuts((state) => state.remove);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const suppressClickRef = useRef(false);

  const Icon = iconFor(shortcut.icon);
  // A nav pill translates; a project pill is somebody's project name and is
  // drawn exactly as they typed it. See `FloatingShortcut.label`.
  const label = shortcut.labelKey ? t(shortcut.labelKey) : shortcut.label;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 460, damping: 32 }}
      drag
      dragMomentum={false}
      dragElastic={0.05}
      /*
       * `zIndex` rides on the pill, not on the layer.
       *
       * The layer used to be `fixed inset-0 z-30` and the pill lifted itself to
       * 60 while dragged — which never worked, because the layer established a
       * stacking context and a child cannot climb out of one. 60 was therefore
       * only ever 60 *within* z-30, so a pill dragged over the top bar (z-40)
       * or either rail (z-50) vanished underneath them, exactly when the user
       * was looking at it.
       *
       * Note it was `position: fixed` doing that, not the `z-index`: fixed and
       * sticky elements always form a stacking context, so merely dropping the
       * z-index would have moved the trap rather than removed it. The layer is
       * `display: contents` now and generates no box at all, which is what lets
       * these two values compete with the rails directly.
       *
       * At rest the pill sits above the top bar and below the side rails — see
       * `RESTING_Z`. While dragged it goes to 70: above both rails, below the
       * tear-off ghost (90) and the expanded stage (80).
       */
      style={{ x, y, left: shortcut.x, top: shortcut.y, zIndex: RESTING_Z }}
      whileDrag={{ scale: 1.04, zIndex: DRAGGING_Z }}
      onDragStart={() => {
        suppressClickRef.current = true;
      }}
      onDragEnd={(_, info) => {
        const next = clampToViewport(shortcut.x + info.offset.x, shortcut.y + info.offset.y);
        // Hand the position back to the store, then zero the transform so the
        // pill does not jump by the offset a second time.
        x.set(0);
        y.set(0);
        move(shortcut.id, next.x, next.y);
      }}
      onClickCapture={(event) => {
        if (!suppressClickRef.current) return;
        suppressClickRef.current = false;
        event.preventDefault();
        event.stopPropagation();
      }}
      className="pointer-events-auto fixed"
    >
      <div
        className={cn(
          'ui-card group/pill flex items-center gap-1 rounded-2xl border border-edge bg-surface-raised/95 py-1 pl-1 pr-1',
          'shadow-[0_16px_36px_-22px_rgb(0_0_0/0.8)] backdrop-blur-md',
        )}
      >
        <span
          aria-hidden
          title={t('nav.dragAnywhere')}
          className="cursor-grab px-0.5 text-content-faint active:cursor-grabbing"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </span>

        <NavLink
          to={shortcut.to}
          end={shortcut.to === '/'}
          className={({ isActive }) =>
            cn(
              'flex min-w-0 items-center gap-2 rounded-xl px-2 py-1.5 text-xs font-semibold',
              'transition-colors duration-150',
              isActive ? 'bg-brand/15 text-brand' : 'text-content-muted hover:text-content',
            )
          }
        >
          <span
            className="grid h-6 w-6 shrink-0 place-items-center rounded-lg"
            style={
              shortcut.color
                ? { backgroundColor: `${shortcut.color}26`, color: shortcut.color }
                : undefined
            }
          >
            <NavGlyph glyph={shortcut.icon} fallback={Icon} className="h-3.5 w-3.5" />
          </span>
          <span className="max-w-[8.5rem] truncate">{label}</span>
        </NavLink>

        <button
          type="button"
          onClick={() => remove(shortcut.id)}
          title={t('nav.sendBackToMenu')}
          aria-label={t('nav.returnToMenu', { label })}
          className={cn(
            'grid h-7 w-7 shrink-0 place-items-center rounded-xl text-content-faint',
            'opacity-0 transition-[opacity,color,background-color] duration-150',
            'hover:bg-brand/10 hover:text-brand focus-visible:opacity-100 group-hover/pill:opacity-100',
          )}
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
};

/**
 * The layer every torn-off menu entry lives on.
 *
 * At rest the pills sit above the page but below the rails and the top bar, so
 * a menu sliding out passes over its own shortcuts rather than being covered by
 * them. A pill being *dragged* inverts that and rides above everything, because
 * the thing under the user's cursor is the one thing that must stay visible.
 * The layer itself is inert; only the pills take the pointer.
 */
export const FloatingShortcutLayer = () => {
  const t = useT();
  const items = useFloatingShortcuts((state) => state.items);
  const move = useFloatingShortcuts((state) => state.move);
  const isTouch = useIsTouchDevice();

  // A window that got narrower must not strand a pill off-screen.
  //
  // Coalesced onto an animation frame: a drag of the window edge fires resize
  // continuously, and each raw call re-clamped every pill, wrote localStorage
  // and re-rendered the layer. One pass per painted frame is all that can
  // possibly be seen.
  useEffect(() => {
    let frame = 0;

    const handleResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        for (const item of useFloatingShortcuts.getState().items) {
          const next = clampToViewport(item.x, item.y);
          if (next.x !== item.x || next.y !== item.y) move(item.id, next.x, next.y);
        }
      });
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', handleResize);
    };
  }, [move]);

  if (isTouch || items.length === 0) return null;

  return createPortal(
    /*
     * `display: contents` — see the note on the pill's `style`.
     *
     * This element must generate no box, so that it forms no stacking context
     * and the pills' own z-indices compete with the rails. It is a grouping
     * node and nothing else: every pill is `position: fixed` and positions
     * itself against the viewport, so there is nothing for a box here to do
     * except trap them.
     *
     * `pointer-events-none` is gone with it. It existed to make a
     * full-viewport overlay inert; there is no longer an overlay to make inert,
     * and the pills carry `pointer-events-auto` themselves.
     */
    <div aria-label={t('nav.pinnedShortcuts')} className="contents">
      <AnimatePresence>
        {items.map((shortcut) => (
          <ShortcutPill key={shortcut.id} shortcut={shortcut} />
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  );
};
