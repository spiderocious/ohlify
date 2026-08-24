import { useCallback, useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

import {
  HawkAdminShell,
  HawkBreadcrumb,
  HawkSearchInput,
  HawkText,
  cn,
  type HawkAdminNavItem,
} from '@ohlify/hawk-ui';

import './admin-shell.css';
import { AdminTopbarActions } from './admin-topbar.js';
import { useCurrentAdmin } from '../auth/use-current-admin.js';
import { activeNavKey, visibleHawkNavItems } from '../config/hawk-nav-items.js';
import { humanizeRole } from '../lib/labels.js';

/**
 * The admin shell — A22 rendered against the live router.
 *
 * `HawkAdminShell` draws the whole board: the 15rem rail, the grouped nav, the
 * operator footer, the 3.5rem topbar, and a BOARD register zone around all of
 * it. That register scope is the load-bearing part — every control rendered
 * inside any admin screen resolves to the dense scale from this one wrapper,
 * rather than each screen threading a `size` prop down through its tree.
 *
 * Two things this shell adds that A22, being a desktop specimen, does not
 * answer:
 *
 * **Mobile.** A22's rail is always on screen. Below `lg` that would eat the
 * page, so the rail becomes a slide-over. The shell component owns its own
 * `<aside>` and exposes no prop for this, so rather than fork it we scope the
 * transform to the aside from the wrapper (`.admin-shell-frame > * > aside`).
 * Forking a design-system component to add a breakpoint is how a design system
 * stops being one.
 *
 * **Logout.** Lives in the topbar slot, where the pre-Hawk shell had it.
 */
export function AdminShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const admin = useCurrentAdmin();

  // Close the drawer on every navigation — an operator should never tap a nav
  // item and be left staring at the drawer that covered the page they opened.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  // Lock the page behind the drawer so it cannot scroll underneath it.
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  const close = useCallback(() => setMobileOpen(false), []);

  const items = visibleHawkNavItems(admin?.role);
  const activeKey = activeNavKey(location.pathname, items);

  // Hawk's nav shape wants `href`; react-router's Link wants `to`. HawkNavLink
  // forwards both and renders whatever `linkAs` is, so one mapping covers it.
  const nav: HawkAdminNavItem[] = items.map((item) => ({
    key: item.key,
    label: item.label,
    icon: item.icon,
    href: item.to,
    ...(item.group ? { group: item.group } : {}),
  }));

  return (
    <div className={cn('admin-shell-frame h-dvh w-full', mobileOpen && 'is-open')}>
      {/* Backdrop — below lg only, only while the drawer is open. */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={close}
        aria-hidden="true"
      />

      <HawkAdminShell
        nav={nav}
        {...(activeKey ? { activeKey } : {})}
        linkAs={Link}
        brand={
          <span className="flex items-baseline gap-hawk-2">
            <HawkText variant="body" ink="strong" className="font-bold">
              Ohlify
            </HawkText>
            <HawkText variant="overline" ink="muted">
              Admin
            </HawkText>
          </span>
        }
        {...(admin
          ? {
              user: {
                name: admin.full_name ?? admin.email,
                role: humanizeRole(admin.role),
              },
            }
          : {})}
        topbar={
          <>
            <HawkBreadcrumb items={[{ label: 'Admin' }]} />
            <div className="ml-auto hidden w-64 md:block">
              <HawkSearchInput placeholder="Search anything" />
            </div>
            <AdminTopbarActions onOpenMenu={() => setMobileOpen(true)} />
          </>
        }
      >
        <Outlet />
      </HawkAdminShell>
    </div>
  );
}
