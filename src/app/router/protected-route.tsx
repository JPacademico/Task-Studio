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
     * Arriving at the front door is not the same as being turned away from one.
     *
     * Somebody who types the bare address has not asked to sign in — they have
     * asked what this is. Answering with a password field is the app assuming a
     * relationship it has not got: no account, no reason to make one yet, and
     * no way to find out what they would be signing up for. So `/` goes to the
     * landing page, and only `/` does.
     *
     * Every *other* protected path still goes to sign-in, because a visitor at
     * `/projects/abc` has asked for something specific that happens to need an
     * account, and a marketing page is not an answer to that question. `from`
     * carries the path they meant, so signing in lands there rather than always
     * on the dashboard.
     *
     * Both redirects are `replace`, so neither becomes a step in the back-button
     * history of somebody who then signs in.
     */
    if (location.pathname === '/') return <Navigate to="/welcome" replace />;

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
 * The landing page is deliberately *not* behind this guard, even though `/` now
 * resolves to it for a guest. Two things point the same way: the documentation
 * page links back to `/welcome`, and a guard there would bounce any signed-in
 * reader following that link to the dashboard instead; and somebody with an
 * account has perfectly ordinary reasons to open the page — to send it to a
 * colleague, to look at what changed. Nothing is protected by hiding it, so
 * nothing is.
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
