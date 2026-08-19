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
      <div className="grid min-h-screen place-items-center">
        <PageLoader label={t('app.openingStudio')} />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user && !user.isVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  return <Outlet />;
};

/** Keeps an authenticated user out of the login/signup screens. */
export const GuestRoute = () => {
  const t = useT();
  const { status, user } = useSessionStore();

  if (status === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center">
        <PageLoader label={t('app.checkingSession')} />
      </div>
    );
  }

  if (status === 'authenticated' && user?.isVerified) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
