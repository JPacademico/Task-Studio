import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useDragControls, useReducedMotion } from 'framer-motion';
import { GripHorizontal } from 'lucide-react';

import { useT } from '@/shared/i18n';
import { LanguageToggle } from '@/features/language-toggle/ui/language-toggle';
import { ThemeToggle } from '@/features/theme-toggle/ui/theme-toggle';
import { wakeApi } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { useIsTouchDevice } from '@/shared/lib/hooks';
import { BrandName, StudioMark } from '@/shared/ui';
import { AuthScene } from './auth-scene';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Shared frame for every unauthenticated screen. The whole viewport is the desk — Post-its, a
 * pinned task, stationery, all of it draggable.
 */
export const AuthShell = ({ title, subtitle, children, footer }: AuthShellProps) => {
  const t = useT();
  const deskRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const isTouch = useIsTouchDevice();
  const reduceMotion = useReducedMotion();

  // Fire-and-forget: the boot overlaps the form being filled in. `wakeApi` no-ops when the
  // container has answered recently, so navigating between login.
  useEffect(wakeApi, []);

  const [hasMoved, setHasMoved] = useState(false);
  const isDraggable = !isTouch && !reduceMotion;

  return (
    <div
      ref={deskRef}
      /* Horizontally clipped, vertically not — in every case. The desk used to be `overflow-hidden`
         outright whenever the card could be dragged. */
      className="relative min-h-dvh overflow-x-hidden overflow-y-auto bg-surface"
    >
      {/* Everything on the desk sits under the card. */}
      <AuthScene bounds={deskRef} />

      <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-5 sm:p-8 xl:p-12">
        <span className="pointer-events-auto inline-flex w-fit items-center gap-2.5">
          <span className="grid h-11 w-11 place-items-center text-brand">
            <StudioMark className="h-11 w-11" interactive />
          </span>
          <BrandName textClassName="font-hand text-base font-bold tracking-normal" />
        </span>

        {/* The headline only. The paragraph that used to sit under it was flavour text on a
            screen whose entire job is two fields and a button. */}
        <div className="hidden max-w-sm lg:block">
          <h2 className="text-balance text-3xl font-bold leading-[1.15] tracking-tight xl:text-4xl">
            {t('auth.hero.title')}
          </h2>
        </div>

        <p className="hidden text-2xs uppercase tracking-[0.18em] text-content-faint sm:block">
          {t('auth.hero.tagline')}
        </p>
      </div>

      {/* Language before theme: it is the choice that has to be made *first*,
          because a reader who cannot read the page cannot find anything else. */}
      {/* Swaps palette with the switch in it; the wave still starts at the top
          edge, since this is not a bar. See `theme-wave.ts`. */}
      <div data-theme-header className="absolute right-4 top-4 z-40 flex items-center gap-1">
        <LanguageToggle withLabel />
        <ThemeToggle />
      </div>

      {/* --- The card --- */}
      {/* Vertical padding that gives way on a short screen. */}
      <div className="pointer-events-none relative z-50 grid min-h-dvh place-items-center px-5 py-12 short:py-5 sm:px-8">
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
            'panel gpu pointer-events-auto relative w-full max-w-[25rem] overflow-hidden',
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
            <span className="text-3xs font-semibold uppercase tracking-[0.16em] text-content-faint">
              {t(hasMoved ? 'auth.dragCard.signIn' : 'auth.dragCard.dragMe')}
            </span>
            <span className="ml-auto flex gap-1" aria-hidden>
              {['bg-danger/60', 'bg-warning/60', 'bg-positive/60'].map((tone) => (
                <span key={tone} className={cn('h-2 w-2 rounded-full', tone)} />
              ))}
            </span>
          </div>

          <div className="p-6 short:p-5 sm:p-7 sm:short:p-5">
            <div className="mb-6 space-y-2 short:mb-4">
              <span className="inline-grid h-11 w-11 place-items-center text-brand lg:hidden">
                <StudioMark className="h-11 w-11" />
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
