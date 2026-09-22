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
  HazardDrift,
  DragonFlight,
  NightEyes,
  PageLoader,
  RouteBoundary,
  RuneScribe,
  WanderingEye,
} from '@/shared/ui';
import { HiddenSidebar } from '@/widgets/hidden-sidebar/ui/hidden-sidebar';
import { BranchCommitPrompt } from '@/features/task-management/ui/branch-commit-prompt';
import { ImportTracker } from '@/widgets/import-tracker/ui/import-tracker';
import { SpotifyPlayer } from '@/widgets/spotify-player/ui/spotify-player';
import { ProjectRail } from '@/widgets/project-rail/ui/project-rail';
import { TopNavigation } from '@/widgets/top-navigation/ui/top-navigation';
import { useShellPrefetch } from './use-shell-prefetch';

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

  // Starts the task menu's request while the dashboard is still rendering, so
  // that page draws populated rather than filling in behind itself.
  useShellPrefetch();

  const openProjectDialog = () => setIsCreateProjectOpen(true);

  return (
    /*
     * Back to `relative` alone.
     *
     * `isolate` was here for exactly one thing — giving the Halloween blood a
     * stacking context to sit behind everything in — and that decoration is
     * gone. Leaving the property behind would be a stacking context nothing
     * asks for, quietly trapping any future negative-z child of this shell.
     */
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

      {/* A repository import in progress, tracked without holding anybody
          still for it. Mounted here for the same reason the chat dock is: the
          import outlives the dialog that started it, and the whole point of
          having made it a background job is that you can walk away from the
          page and it carries on. Renders nothing at all when there is no
          import running. */}
      <ImportTracker />

      {/* The music, for whoever connected an account. Mounted by the shell
          rather than by a page, because it is the reader's own furniture: it
          survives every route change, it keeps the corner they parked it in,
          and it renders nothing at all for everybody else — see
          `SpotifyPlayer`. */}
      <SpotifyPlayer />

      {/*
        Mounted once, for the same reason the tracker is: a task can be
        completed from five surfaces and every one of them goes through one
        mutation, so one dialog listening beats five mounting their own. See
        `useCommitPrompt`.
      */}
      <BranchCommitPrompt />

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

      {/* And contamination going up off the containment skin. Same contract
          again, and the cheapest of the three: transform and opacity only, so
          it composites without a repaint. See `hazard-decor`. */}
      <HazardDrift />

      {/* Something notices you once a minute on the halloween skin: two warm
          points somewhere on the page, held for a moment, then gone in a
          tenth of a second. Same contract as everything above it — one skin,
          nothing under `prefers-reduced-motion`, fixed, aria-hidden and
          pointer-events-none. See `halloween-decor`. */}
      <NightEyes />

      {/* And once a minute on the imperial skin, something long crosses the
          hall from one side to the other and is gone. The longest-lived of
          these by a distance — eleven seconds against a third of a second —
          which is why it is drawn at a fraction of the opacity: it has to be
          survivable sixty times an hour on a page somebody is working on. Same
          contract as everything above it. See `dragon-decor`. */}
      <DragonFlight />

      <div
        className={cn(
          'transition-[padding] duration-300 ease-studio',
          /*
           * The gutters a pinned rail needs, in the rail's own units.
           *
           * These were `264px` and `260px` — the two rails' widths as they
           * measure at a 16px root. The rails themselves are `w-[16.5rem]` and
           * `w-[16.25rem]`, so from 1024px up, where the root scale kicks in,
           * they grew and the gutters did not: at the 22px ceiling a pinned
           * rail is 363px wide over a 264px gutter and covers the first
           * hundred pixels of the page. Stated in `rem`, the two can only
           * agree. See `hidden-sidebar` and `project-rail` for the widths.
           */
          !isTouch && pinned.left && 'pl-[16.5rem]',
          !isTouch && pinned.right && 'pr-[16.25rem]',
        )}
      >
        <main
          className={cn(
            /*
             * Tighter on phones so more of the page fits before the first
             * scroll, and a cap that keeps growing on panels the root scale
             * has stopped growing for.
             *
             * `max(87.5rem, 78vw)` is the whole idea: below about 1900px the
             * `rem` term wins and the column is exactly what it has always
             * been — the root scale is still climbing there, so the column
             * climbs with it. Past that the root hits its ceiling and the
             * `vw` term takes over, so a 2560 panel gets a ~2000px column
             * instead of a 1700px one and a 3440 gets ~2450px instead of the
             * same 1700px with 850px of margin on either side. `min(124rem,
             * …)` is the backstop: a column wider than that is a line of text
             * nobody can track back to the start of, and 124rem at the 22px
             * ceiling is already 2728px.
             *
             * Pages that are prose rather than workspace set their own,
             * narrower caps inside this one — settings at `max-w-3xl`, the
             * docs at `max-w-6xl` — so widening here cannot stretch a
             * paragraph across a television.
             */
            'mx-auto w-full max-w-[min(124rem,max(87.5rem,78vw))] px-3 pb-16 sm:px-6 sm:pb-24 lg:px-10',
            // The bar is always on for touch, so the gutter is only needed there
            // — or when the user has pinned it open on desktop.
            // The bar is `3.5rem` plus whatever the notch takes, so the
            // gutter has to be measured the same way rather than hard-coded.
            isTouch || pinned.top
              ? 'pt-[calc(4.5rem+env(safe-area-inset-top,0px))]'
              : 'pt-6 sm:pt-10',
            // Landscape on a notched phone puts the cutout on one side.
            'safe-l safe-r',
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
