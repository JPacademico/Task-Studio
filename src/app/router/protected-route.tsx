import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useSessionStore } from '@/features/auth/model/session.store';
import { PageLoader } from '@/shared/ui';

/** Signed-in and email-confirmed, or you do not get in. */
export const ProtectedRoute = () => {
  const location = useLocation();
  const { status, user } = useSessionStore();

  if (status === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center">
        <PageLoader label="Opening studio" />
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
  const { status, user } = useSessionStore();

  if (status === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center">
        <PageLoader label="Checking session" />
      </div>
    );
  }

  if (status === 'authenticated' && user?.isVerified) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
