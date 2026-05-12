import { Navigate, Outlet } from 'react-router-dom';

import type { AdminRole } from '@ohlify/api';

import { useCurrentAdmin } from '../auth/use-current-admin.js';
import { ADMIN_ROUTES } from '../routes/admin-routes.js';

interface RoleGuardProps {
  allow: readonly AdminRole[];
}

/**
 * Page-level role gate. Backend enforces this too (requireAdminRole) — this
 * is purely UX so a support user that hand-crafts a `/wallets` URL gets
 * bounced back to the dashboard instead of landing on a 403 page.
 */
export function RoleGuard({ allow }: RoleGuardProps) {
  const admin = useCurrentAdmin();
  if (!admin) {
    return <Navigate to={ADMIN_ROUTES.LOGIN.absPath} replace />;
  }
  if (!allow.includes(admin.role)) {
    return <Navigate to={ADMIN_ROUTES.DASHBOARD.absPath} replace />;
  }
  return <Outlet />;
}
