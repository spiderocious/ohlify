import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { adminApiClient, adminSession, ADMIN_EP } from '@ohlify/api';
import { HawkIconButton, IconLogOut, IconMenu } from '@ohlify/hawk-ui';

import { useCurrentAdmin } from '../auth/use-current-admin.js';
import { ADMIN_ROUTES } from '../routes/admin-routes.js';

interface AdminTopbarActionsProps {
  /** Opens the mobile rail. The shell owns that state. */
  onOpenMenu: () => void;
}

/**
 * The trailing controls in the shell's topbar slot.
 *
 * This used to be a whole `<header>`. `HawkAdminShell` draws the bar itself
 * now, and the operator's name and role moved to the rail's footer where A22
 * puts them — so what is left here is the two controls the board has nowhere
 * else to put: the mobile menu trigger and logout.
 *
 * Logout clears the local session whether or not the revoke call succeeds. A
 * network failure must not trap an admin in a logged-in state on a shared
 * machine — the local clear is the part that protects them, and the server
 * call is best-effort cleanup.
 */
export function AdminTopbarActions({ onOpenMenu }: AdminTopbarActionsProps) {
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
    <div className="flex items-center gap-hawk-3">
      {/* Menu trigger — the rail is always on screen from lg up. */}
      <div className="lg:hidden">
        <HawkIconButton
          icon={IconMenu}
          label="Open menu"
          variant="plain"
          size="sm"
          onClick={onOpenMenu}
        />
      </div>

      {admin && (
        <HawkIconButton
          icon={IconLogOut}
          label="Log out"
          variant="plain"
          size="sm"
          loading={busy}
          onClick={() => void handleLogout()}
        />
      )}
    </div>
  );
}
