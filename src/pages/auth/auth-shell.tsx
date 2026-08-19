import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useDragControls, useReducedMotion } from 'framer-motion';
import { GripHorizontal } from 'lucide-react';

import { ThemeToggle } from '@/features/theme-toggle/ui/theme-toggle';
import { wakeApi } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { useIsTouchDevice } from '@/shared/lib/hooks';
import { StudioMark } from '@/shared/ui';
import { AuthScene } from './auth-scene';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Shared frame for every unauthenticated screen.
 *
 * The whole viewport is the desk — Post-its, a pinned task, stationery, all of
 * it draggable — and the sign-in card is simply the heaviest object on it. It
 * has its own grab bar, it can be dropped anywhere on the surface, and it sits
 * above everything else at every moment, so sliding it across the desk never
 * buries the two fields the user actually came for.
 *
 * The card drags from its handle only (`dragListener={false}` plus explicit
 * `dragControls`): dragging the whole card would mean selecting text in the
 * email field moves the window instead.
 *
 * Touch devices keep the card planted. There is no hover there, the desk is
 * decoration, and a draggable form on a phone is a form you can lose.
 *
 * It is also where the API gets woken (`wakeApi`). Every unauthenticated
 * screen renders through here, so this is the earliest moment the app knows
 * somebody is about to need the server — and the seconds between this frame
 * appearing and a password being typed are exactly the seconds a free-tier
 * container needs to start.
 */
export const AuthShell = ({ title, subtitle, children, footer }: AuthShellProps) => {
  const deskRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const isTouch = useIsTouchDevice();
  const reduceMotion = useReducedMotion();

  // Fire-and-forget: the boot overlaps the form being filled in. `wakeApi`
  // no-ops when the container has answered recently, so navigating between
  // login, sign-up and reset does not ping it again.
  useEffect(wakeApi, []);

  const [hasMoved, setHasMoved] = useState(false);
  const isDraggable = !isTouch && !reduceMotion;

  return (
    <div
      ref={deskRef}
      className={cn(
        'relative min-h-screen bg-surface',
        // Only clamp the desk where things are actually thrown around. On touch
        // the card is planted and a tall form has to be able to scroll.
        isDraggable ? 'overflow-hidden' : 'overflow-x-hidden',
      )}
    >
      {/* Everything on the desk sits under the card. */}
      <AuthScene bounds={deskRef} />

      <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-5 sm:p-8 xl:p-12">
        <span className="pointer-events-auto inline-flex w-fit items-center gap-2.5">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand/15 text-brand ring-1 ring-inset ring-brand/25">
            <StudioMark className="h-8 w-8" interactive />
          </span>
          <span className="text-sm font-bold tracking-tight">Task Studio</span>
        </span>

        <div className="hidden max-w-sm space-y-2 lg:block">
          <h2 className="text-balance text-3xl font-bold leading-[1.15] tracking-tight xl:text-4xl">
            Work that behaves like paper.
          </h2>
          <p className="text-sm leading-relaxed text-content-muted">
            Boards you can pin, notes you can move, deadlines that speak up. Everything on this
            desk is real — go on, drag it. The card too.
          </p>
        </div>

        <p className="hidden text-[11px] uppercase tracking-[0.18em] text-content-faint sm:block">
          Personal &amp; collaborative project studio
        </p>
      </div>

      <div className="absolute right-4 top-4 z-40">
        <ThemeToggle />
      </div>

      {/* --- The card ---------------------------------------------------------
          A grid that centres its only child, so the drag offset starts from the
          middle of the screen at any viewport size without measuring anything. */}
      <div className="pointer-events-none relative z-50 grid min-h-screen place-items-center px-5 py-12 sm:px-8">
        <motion.div
          drag={isDraggable}
          dragListener={false}
          dragControls={dragControls}
          dragMomentum={false}
          dragElastic={0.03}
          dragConstraints={deskRef}
          onDragStart={() => setHasMoved(true)}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          whileDrag={{ scale: 1.02, rotate: -0.4 }}
          className={cn(
            'panel gpu pointer-events-auto relative w-full max-w-[400px] overflow-hidden',
            'shadow-[0_40px_90px_-40px_rgb(0_0_0/0.75)]',
          )}
        >
          {/* The grab bar. The only part that picks the card up. */}
          <div
            onPointerDown={(event) => isDraggable && dragControls.start(event)}
            className={cn(
              'flex items-center gap-2 border-b border-edge/70 bg-surface-sunken/60 px-4 py-2',
              isDraggable ? 'cursor-grab touch-none select-none active:cursor-grabbing' : 'hidden',
            )}
          >
            <GripHorizontal className="h-3.5 w-3.5 text-content-faint" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-content-faint">
              {hasMoved ? 'Sign in' : 'Drag me anywhere'}
            </span>
            <span className="ml-auto flex gap-1" aria-hidden>
              {['bg-danger/60', 'bg-warning/60', 'bg-positive/60'].map((tone) => (
                <span key={tone} className={cn('h-2 w-2 rounded-full', tone)} />
              ))}
            </span>
          </div>

          <div className="p-6 sm:p-7">
            <div className="mb-6 space-y-2">
              <span className="inline-grid h-11 w-11 place-items-center rounded-2xl bg-brand/15 text-brand ring-1 ring-inset ring-brand/25 lg:hidden">
                <StudioMark className="h-8 w-8" />
              </span>
              <h1 className="pt-1 text-2xl font-bold tracking-tight">{title}</h1>
              {subtitle && <p className="text-sm leading-relaxed text-content-muted">{subtitle}</p>}
            </div>

            {children}

            {footer && <div className="mt-6 border-t border-edge pt-4 text-sm">{footer}</div>}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
