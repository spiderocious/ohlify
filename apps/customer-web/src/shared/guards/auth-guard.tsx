import { Navigate, Outlet } from 'react-router-dom';
import { session } from '@ohlify/api';
import { ROUTES } from '@ohlify/core';

export function AuthGuard() {
  if (!session.hasTokens()) {
    return <Navigate to={ROUTES.LOGIN.absPath} replace />;
  }
  return <Outlet />;
}
