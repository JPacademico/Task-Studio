import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValue } from 'framer-motion';
import { GripVertical, Undo2 } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { useIsTouchDevice } from '@/shared/lib/hooks';
import { NavGlyph } from '@/shared/ui';
import { clampToViewport, useFloatingShortcuts, type FloatingShortcut } from '../model/shortcuts.store';
import { iconFor } from './shortcut-icon';

/**
 * One pinned menu entry, sitting wherever the user dropped it.
 *
 * `left`/`top` come from the store and the drag runs on motion values, so
 * moving a pill never re-renders anything until the gesture ends — and the
 * transform is zeroed on release, when the stored coordinates take over.
 */
const ShortcutPill = ({ shortcut }: { shortcut: FloatingShortcut }) => {
  const move = useFloatingShortcuts((state) => state.move);
  const remove = useFloatingShortcuts((state) => state.remove);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const suppressClickRef = useRef(false);

  const Icon = iconFor(shortcut.icon);

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
      style={{ x, y, left: shortcut.x, top: shortcut.y }}
      whileDrag={{ scale: 1.04, zIndex: 60 }}
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
          title="Drag me anywhere"
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
          <span className="max-w-[8.5rem] truncate">{shortcut.label}</span>
        </NavLink>

        <button
          type="button"
          onClick={() => remove(shortcut.id)}
          title="Send it back to the menu"
          aria-label={`Return ${shortcut.label} to the menu`}
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
 * Sits above the page but below the rails and the top bar, so a menu sliding
 * out passes over its own shortcuts rather than being covered by them. The
 * layer itself is inert; only the pills take the pointer.
 */
export const FloatingShortcutLayer = () => {
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
    <div aria-label="Pinned shortcuts" className="pointer-events-none fixed inset-0 z-30">
      <AnimatePresence>
        {items.map((shortcut) => (
          <ShortcutPill key={shortcut.id} shortcut={shortcut} />
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  );
};
