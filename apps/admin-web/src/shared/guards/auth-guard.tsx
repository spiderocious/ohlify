import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { adminSession } from '@ohlify/api';

import { ADMIN_ROUTES } from '../routes/admin-routes.js';

/**
 * Gate every protected route on `adminSession.hasTokens()`. Forwards the
 * intended path via `state.from` so the login screen can bounce back here
 * after a successful sign-in.
 */
export function AuthGuard() {
  const location = useLocation();
  if (!adminSession.hasTokens()) {
    return <Navigate to={ADMIN_ROUTES.LOGIN.absPath} replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
