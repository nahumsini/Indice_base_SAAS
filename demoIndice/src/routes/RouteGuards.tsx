import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export function RequireSession() {
  const { isLoading, session } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export function RedirectWhenAuthenticated() {
  const { isLoading, session } = useAuth();

  if (isLoading) {
    return null;
  }

  if (session) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}
