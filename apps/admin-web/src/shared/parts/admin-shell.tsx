import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { AdminSidebar } from './admin-sidebar.js';
import { AdminTopbar } from './admin-topbar.js';

/**
 * Layout for the admin app. Desktop shows the sidebar in-flow; below lg
 * it collapses into a hamburger-driven slide-over so admin work on a
 * tablet / phone stays usable without a layout shift each time the menu
 * opens (the sidebar is `position: fixed` in that mode — see
 * [AdminSidebar]).
 *
 * The shell owns the open state so the topbar's hamburger and the
 * sidebar's close button can both poke it. We also auto-close on every
 * pathname change — admins should never tap a nav item and see the
 * drawer linger.
 */
export function AdminShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close the drawer whenever the URL changes. NavLink taps fire a
  // `<NavLink>` -> router push -> location update, so this catches every
  // in-app navigation even though the sidebar's own click handler
  // doesn't directly close.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const open = useCallback(() => setMobileOpen(true), []);
  const close = useCallback(() => setMobileOpen(false), []);

  return (
    <div className="flex h-dvh w-full bg-surface-light text-text-primary">
      <AdminSidebar mobileOpen={mobileOpen} onClose={close} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar onOpenMenu={open} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
