import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { adminApiClient, adminSession, ADMIN_EP } from '@ohlify/api';
import { AppText, cn } from '@ohlify/ui';
import { IconLogout, IconMenu } from '@icons';

import { useCurrentAdmin } from '../auth/use-current-admin.js';
import { ADMIN_ROUTES } from '../routes/admin-routes.js';

interface AdminTopbarProps {
  /** Called when the mobile hamburger is tapped (parent owns sidebar state). */
  onOpenMenu?: () => void;
}

/**
 * Top bar shown above every protected page. Renders a hamburger on mobile,
 * the admin's email + role badge, and a logout button. Logout fires the
 * backend revoke and clears local session whether or not the request
 * succeeds — a network failure shouldn't trap an admin in a logged-in
 * state on a shared machine.
 */
export function AdminTopbar({ onOpenMenu }: AdminTopbarProps) {
  const admin = useCurrentAdmin();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const handleLogout = async () => {
    if (busy) return;
    setBusy(true);
    const refresh = adminSession.getRefresh();
    try {
      if (refresh) {
        await adminApiClient
          .post(ADMIN_EP.AUTH_LOGOUT, { json: { refresh_token: refresh } })
          .catch(() => undefined);
      }
    } finally {
      adminSession.clear();
      navigate(ADMIN_ROUTES.LOGIN.absPath, { replace: true });
    }
  };

  return (
    <header className="flex h-16 items-center gap-3 border-b border-border bg-surface px-4 sm:px-6">
      {onOpenMenu && (
        <button
          type="button"
          aria-label="Open menu"
          onClick={onOpenMenu}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-text-primary lg:hidden"
        >
          <IconMenu size={18} />
        </button>
      )}

      <span className="flex-1" />

      {admin && (
        <div className="flex items-center gap-3">
          <div className="hidden flex-col items-end sm:flex">
            <AppText variant="body" className="font-semibold text-text-primary">
              {admin.full_name ?? admin.email}
            </AppText>
            <span
              className={cn(
                'text-[11px] font-bold uppercase tracking-wider',
                roleColor(admin.role),
              )}
            >
              {humanizeRole(admin.role)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            aria-label="Log out"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-primary hover:bg-secondary/70"
          >
            <IconLogout size={16} />
          </button>
        </div>
      )}
    </header>
  );
}

function humanizeRole(role: string): string {
  if (role === 'finance_ops') return 'Finance';
  if (role === 'admin') return 'Admin';
  if (role === 'support') return 'Support';
  return role;
}

function roleColor(role: string): string {
  if (role === 'admin') return 'text-primary';
  if (role === 'finance_ops') return 'text-emerald-600';
  return 'text-text-muted';
}
