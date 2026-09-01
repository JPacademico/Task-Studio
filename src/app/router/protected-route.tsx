import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useSessionStore } from '@/features/auth/model/session.store';
import { PageLoader } from '@/shared/ui';
import { useT } from '@/shared/i18n';

/** Signed-in and email-confirmed, or you do not get in. */
export const ProtectedRoute = () => {
  const t = useT();
  const location = useLocation();
  const { status, user } = useSessionStore();

  if (status === 'loading') {
    return (
      <div className="grid min-h-dvh place-items-center">
        <PageLoader label={t('app.openingStudio')} />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    /*
     * Every unauthenticated visitor gets the sign-in screen, including the one
     * who typed the bare address.
     *
     * This used to send `/` to the landing page, on the argument that arriving
     * at the front door is not the same as being turned away from one. The
     * argument still holds — it is simply not the argument that decides this
     * yet. The marketing page is unfinished, and a first screen that is not
     * ready is worse than a plain sign-in form for *everybody*, including the
     * newcomer it was written for. So the landing page is off the front door
     * and stays reachable at `/welcome`, where it can be looked at
     * deliberately rather than by default. Restoring the old behaviour is this
     * one line.
     *
     * `from` is still carried for every path, `/` included, so signing in
     * lands where the visitor meant to go rather than always on the dashboard.
     * The redirect is `replace`, so the sign-in screen does not become a step
     * in the back-button history of somebody who then signs in.
     */
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user && !user.isVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  return <Outlet />;
};

/**
 * Keeps an authenticated user out of the login and sign-up screens.
 *
 * The landing page used to be behind this guard too, on the reasoning that
 * somebody already signed in has no use for being sold the product. It is not
 * any more, and the reason is the reason it is at `/welcome` at all: while the
 * page is unfinished, the people who most need to open it are the ones with an
 * account — and a guard that bounced every signed-in visitor to `/` made the
 * address useless to exactly them. It goes back behind this guard on the day
 * `/` is the landing page again.
 */
export const GuestRoute = () => {
  const t = useT();
  const { status, user } = useSessionStore();

  if (status === 'loading') {
    return (
      <div className="grid min-h-dvh place-items-center">
        <PageLoader label={t('app.checkingSession')} />
      </div>
    );
  }

  if (status === 'authenticated' && user?.isVerified) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
