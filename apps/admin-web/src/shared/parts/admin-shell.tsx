import { Outlet } from 'react-router-dom';

import { AdminSidebar } from './admin-sidebar.js';
import { AdminTopbar } from './admin-topbar.js';

/**
 * Desktop-first layout for the admin app. Mobile is a non-goal here —
 * admin work happens on a desktop monitor — so we don't ship a bottom-nav
 * variant the way @ohlify/ui's AppShell does for customer-web.
 */
export function AdminShell() {
  return (
    <div className="flex h-dvh w-full bg-surface-light text-text-primary">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
