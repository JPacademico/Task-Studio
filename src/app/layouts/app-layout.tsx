import { Suspense, useCallback, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

import { FloatingShortcutLayer } from '@/features/floating-shortcuts/ui/floating-shortcut-layer';
import { LiveCallGuard } from '@/features/live-rooms/ui/live-call-guard';
import { ChatDock } from '@/features/project-chat-dock/ui/chat-dock';
import type { BoardProvider } from '@/entities/integration/model/types';
import { useBoardConnectOutcome } from '@/features/board-sync/model/connect';
import { CreateProjectDialog } from '@/features/project-management/ui/create-project-dialog';
import { cn } from '@/shared/lib/cn';
import { useIsTouchDevice } from '@/shared/lib/hooks';
import { useNavPreferences } from '@/shared/lib/nav-preferences.store';
import {
  AutumnFall,
  BubbleRise,
  EmberRise,
  HazardDrift,
  DragonFlight,
  KrakenRise,
  NightEyes,
  PageLoader,
  RouteBoundary,
  RuneScribe,
  ShootingStar,
} from '@/shared/ui';
import { HiddenSidebar } from '@/widgets/hidden-sidebar/ui/hidden-sidebar';
import { BranchCommitPrompt } from '@/features/task-management/ui/branch-commit-prompt';
import { ImportTracker } from '@/widgets/import-tracker/ui/import-tracker';
import { SpotifyPlayer } from '@/widgets/spotify-player/ui/spotify-player';
import { ProjectRail } from '@/widgets/project-rail/ui/project-rail';
import { TopNavigation } from '@/widgets/top-navigation/ui/top-navigation';
import { DeletionBanner } from '@/features/account-deletion/ui/deletion-banner';
import { useShellPrefetch } from './use-shell-prefetch';

/**
 * The shell every authenticated page renders inside. Both menus are `position: fixed` and hidden by
 * default, so the content column normally owns the full viewport — no reserved gutters.
 */
export const AppLayout = () => {
  const location = useLocation();
  const isTouch = useIsTouchDevice();
  const pinned = useNavPreferences((state) => state.pinned);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [resumedBoard, setResumedBoard] = useState<BoardProvider | undefined>();

  // Starts the task menu's request while the dashboard is still rendering, so
  // that page draws populated rather than filling in behind itself.
  useShellPrefetch();

  const openProjectDialog = () => {
    setResumedBoard(undefined);
    setIsCreateProjectOpen(true);
  };

  // Back from connecting Trello or Jira inside the import dialog: reopen it there.
  useBoardConnectOutcome(
    useCallback((provider: BoardProvider) => {
      setResumedBoard(provider);
      setIsCreateProjectOpen(true);
    }, []),
  );

  return (
    /* Back to `relative` alone. `isolate` was here for exactly one thing — giving the Halloween
       blood a stacking context to sit behind everything in — and that decoration is gone. */
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

      {/* The project conversation. Mounted by the shell rather than by the project page. */}
      <ChatDock />

      {/* A repository import in progress, tracked without holding anybody still for it. */}
      <ImportTracker />

      {/* The music, for whoever connected an account. Mounted by the shell rather than by a
          page, because it is the reader's own furniture: it survives every route change. */}
      <SpotifyPlayer />

      {/* Mounted once, for the same reason the tracker is: a task can be completed from five
          surfaces and every one of them goes through one mutation. */}
      <BranchCommitPrompt />

      {/* Asks before a navigation outside the project hangs up a live call. Inert, and attached
          to nothing, whenever there is no call. */}
      <LiveCallGuard />

      {/* Something comes up over the bottom of the window once a minute, holds for three
          seconds and drops back. */}
      <KrakenRise />

      {/* Leaves coming down over the page. Inert on every skin but the autumn one and under
          `prefers-reduced-motion`, and — like the eye — fixed. */}
      <AutumnFall />

      {/* Something keeps carving runes on the walls. Same contract as the two above: one skin
          only, nothing under `prefers-reduced-motion`, fixed. */}
      <RuneScribe />

      {/* Bubbles going up, and embers going up — the same mechanic read in two worlds, and the
          same contract as everything above. */}
      <BubbleRise />
      <EmberRise />

      {/* And contamination going up off the containment skin. Same contract again, and the
          cheapest of the three: transform and opacity only, so it composites without a repaint. */}
      <HazardDrift />

      {/* Something notices you once a minute on the halloween skin: two warm points somewhere
          on the page, held for a moment, then gone in a tenth of a second. */}
      <NightEyes />

      {/* And once a minute on the imperial skin, something long crosses the hall from one side
          to the other and is gone. */}
      <DragonFlight />

      {/* And once a minute on the space skin, a shooting star crosses the sky from left to
          right in under a second. */}
      <ShootingStar />

      <div
        className={cn(
          'transition-[padding] duration-300 ease-studio',
          /* The gutters a pinned rail needs, in the rail's own units. These were `264px` and
             `260px` — the two rails' widths as they measure at a 16px root. */
          !isTouch && pinned.left && 'pl-[16.5rem]',
          !isTouch && pinned.right && 'pr-[16.25rem]',
        )}
      >
        <main
          className={cn(
            /* Tighter on phones so more of the page fits before the first scroll, and a cap that
               keeps growing on panels the root scale has stopped growing for. */
            'mx-auto w-full max-w-[min(124rem,max(87.5rem,78vw))] px-3 pb-16 sm:px-6 sm:pb-24 lg:px-10',
            // The bar is always on for touch, so the gutter is only needed there — or when the user
            // has pinned it open on desktop.
            isTouch || pinned.top
              ? 'pt-[calc(4.5rem+env(safe-area-inset-top,0px))]'
              : 'pt-6 sm:pt-10',
            // Landscape on a notched phone puts the cutout on one side.
            'safe-l safe-r',
          )}
        >
          <DeletionBanner />

          {/* Route transitions animate opacity/translate only, and the wrapper is keyed by
              pathname so React remounts it and the enter animation runs per route. */}
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
        initialBoardSource={resumedBoard}
      />
    </div>
  );
};
