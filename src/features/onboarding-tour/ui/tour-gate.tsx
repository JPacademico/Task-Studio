import { lazy, Suspense, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { useCurrentUser } from '@/features/auth/model/session.store';
import { isTourDoneHere, useTour } from '../model/tour.store';

// Fetched only for an account that has the tour to take; everybody else never downloads it.
const TourOverlay = lazy(() => import('./tour-overlay'));

/** How long the dashboard gets to draw before the tour opens over it. */
const SETTLE_MS = 900;

/**
 * Opens the tour once, the first time a new account reaches its dashboard, and holds it while open.
 * Settings opens it again on request — see `useTour`.
 */
export const TourGate = () => {
  const isOpen = useTour((state) => state.isOpen);
  const start = useTour((state) => state.start);
  const user = useCurrentUser();
  const { pathname } = useLocation();

  // `null`, not falsy: an API that predates the field sends nothing, and nothing is not "new".
  const isFirstVisit =
    Boolean(user?.isVerified) && user?.tutorialCompletedAt === null && !isTourDoneHere(user.id);

  useEffect(() => {
    if (!isFirstVisit || isOpen || pathname !== '/') return;
    const timer = window.setTimeout(start, SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [isFirstVisit, isOpen, pathname, start]);

  if (!isOpen) return null;

  return (
    <Suspense fallback={null}>
      <TourOverlay />
    </Suspense>
  );
};
