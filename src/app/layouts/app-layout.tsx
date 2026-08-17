import { Suspense, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

import { FloatingShortcutLayer } from '@/features/floating-shortcuts/ui/floating-shortcut-layer';
import { ChatDock } from '@/features/project-chat-dock/ui/chat-dock';
import { CreateProjectDialog } from '@/features/project-management/ui/create-project-dialog';
import { cn } from '@/shared/lib/cn';
import { useIsTouchDevice } from '@/shared/lib/hooks';
import { useNavPreferences } from '@/shared/lib/nav-preferences.store';
import {
  AutumnFall,
  BubbleRise,
  EmberRise,
  PageLoader,
  RouteBoundary,
  RuneScribe,
  WanderingEye,
} from '@/shared/ui';
import { HiddenSidebar } from '@/widgets/hidden-sidebar/ui/hidden-sidebar';
import { ProjectRail } from '@/widgets/project-rail/ui/project-rail';
import { TopNavigation } from '@/widgets/top-navigation/ui/top-navigation';

/**
 * The shell every authenticated page renders inside.
 *
 * Both menus are `position: fixed` and hidden by default, so the content column
 * normally owns the full viewport — no reserved gutters, no layout shift when a
 * menu slides in. The one exception is a *pinned* menu: that one is permanent
 * furniture, so the column gives it real space instead of hiding underneath.
 */
export const AppLayout = () => {
  const location = useLocation();
  const isTouch = useIsTouchDevice();
  const pinned = useNavPreferences((state) => state.pinned);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);

  const openProjectDialog = () => setIsCreateProjectOpen(true);

  return (
    <div className="relative min-h-full bg-surface">
      <TopNavigation
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        onCreateProject={openProjectDialog}
      />

      <HiddenSidebar
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />

      <ProjectRail onCreateProject={openProjectDialog} />

      {/* Menu entries the user has pulled out of a rail and pinned to the
          screen. Its own portalled layer, so it survives route changes. */}
      <FloatingShortcutLayer />

      {/* The project conversation. Mounted by the shell rather than by the
          project page, which is the whole reason a pinned chat can stay open
          while the user is somewhere else entirely. */}
      <ChatDock />

      {/* Something opens an eye somewhere on the page every twenty seconds.
          Inert on every skin but the eldritch one, and inert entirely under
          `prefers-reduced-motion` — it is fixed, aria-hidden and
          pointer-events-none, so it can never take a click off a control. */}
      <WanderingEye />

      {/* Leaves coming down over the page. Inert on every skin but the autumn
          one and under `prefers-reduced-motion`, and — like the eye — fixed,
          aria-hidden and pointer-events-none, so it sits between the content
          and the chrome without ever being able to take a click. */}
      <AutumnFall />

      {/* Something keeps carving runes on the walls. Same contract as the two
          above: one skin only, nothing under `prefers-reduced-motion`, fixed,
          aria-hidden and pointer-events-none. */}
      <RuneScribe />

      {/* Bubbles going up, and embers going up — the same mechanic read in two
          worlds, and the same contract as everything above. Both are pure CSS
          fields with no scheduler, so on the eleven skins that are neither of
          these they cost one `null` return each. */}
      <BubbleRise />
      <EmberRise />

      <div
        className={cn(
          'transition-[padding] duration-300 ease-studio',
          !isTouch && pinned.left && 'pl-[264px]',
          !isTouch && pinned.right && 'pr-[260px]',
        )}
      >
        <main
          className={cn(
            // Tighter on phones so more of the page fits before the first scroll.
            'mx-auto w-full max-w-[1400px] px-3 pb-16 sm:px-6 sm:pb-24 lg:px-10',
            // The bar is always on for touch, so the gutter is only needed there
            // — or when the user has pinned it open on desktop.
            isTouch || pinned.top ? 'pt-[4.5rem]' : 'pt-6 sm:pt-10',
          )}
        >
          {/*
            Route transitions animate opacity/translate only, and the wrapper is
            keyed by pathname so React remounts it and the enter animation runs
            per route.

            No <AnimatePresence mode="wait"> here, deliberately. Every page in
            this shell is lazily imported: with `mode="wait"` the exiting page
            has to finish before the next one mounts, but the next one suspends
            on its chunk, and AnimatePresence can be left holding an exit that
            never resolves — which is exactly the "the tab is blank until I
            click something else" bug. Suspense also sits *inside* the wrapper,
            so a pending chunk swaps the body for the loader instead of
            unmounting the animated container around it.
          */}
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="gpu"
          >
            <RouteBoundary resetKey={location.pathname}>
              <Suspense fallback={<PageLoader />}>
                <Outlet />
              </Suspense>
            </RouteBoundary>
          </motion.div>
        </main>
      </div>

      <CreateProjectDialog
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
      />
    </div>
  );
};
