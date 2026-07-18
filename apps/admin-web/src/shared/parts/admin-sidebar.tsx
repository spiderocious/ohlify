import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { cn } from '@ohlify/ui';
import { IconClose } from '@icons';

import { visibleNavItems } from '../config/nav-items.js';
import { useCurrentAdmin } from '../auth/use-current-admin.js';

interface AdminSidebarProps {
  /** Whether the off-canvas (mobile) drawer is open. Ignored on lg+. */
  mobileOpen: boolean;
  /** Called to close the mobile drawer (backdrop click, Esc, nav). */
  onClose: () => void;
}

/**
 * Router-aware sidebar. Two layouts in one component:
 *
 *   - **lg+**: in-flow column, always visible. Same look the admin app
 *     has shipped with since day one.
 *
 *   - **<lg**: fixed-position slide-over driven by [mobileOpen]. The
 *     drawer is `position: fixed` so opening it doesn't push the main
 *     column around (no layout shift). A backdrop sits at `z-40`, the
 *     drawer at `z-50`, and Esc + backdrop click close. The parent
 *     `AdminShell` also auto-closes on navigation, so users never see
 *     the drawer linger after tapping a nav item.
 */
export function AdminSidebar({ mobileOpen, onClose }: AdminSidebarProps) {
  const admin = useCurrentAdmin();
  const items = visibleNavItems(admin?.role);
  const location = useLocation();

  // Close on route change. The shell-level effect handles this too, but
  // having it here means the sidebar stays consistent regardless of how
  // it's mounted.
  useEffect(() => {
    if (mobileOpen) onClose();
    // We deliberately depend on pathname only — re-running on `mobileOpen`
    // would close the drawer the moment it opens.
  }, [location.pathname]);

  // Esc closes the drawer (mobile only — desktop never enters the open
  // state). No-op when [mobileOpen] is false.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen, onClose]);

  // Lock body scroll while the off-canvas is open so the page underneath
  // doesn't scroll behind the drawer.
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  return (
    <>
      {/* Backdrop — mobile only, only when open. lg+ never renders this. */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        aria-label="Admin navigation"
        className={cn(
          // Layout: fixed slide-over below lg, in-flow column from lg up.
          'flex h-dvh w-60 shrink-0 flex-col gap-1 border-r border-border bg-nav-background px-3 py-6',
          // Below lg: fixed-position, off-canvas, transitions in.
          'fixed inset-y-0 left-0 z-50 transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          // From lg: static column, always on-screen, no transform.
          'lg:static lg:translate-x-0 lg:transition-none',
        )}
      >
        <div className="flex items-center justify-between px-3 pb-6">
          <div>
            <span className="text-2xl font-extrabold text-text-deep-blue">ohlify</span>
            <span className="ml-1.5 align-middle text-[10px] font-bold uppercase tracking-wider text-text-muted">
              admin
            </span>
          </div>
          {/* In-drawer close — only relevant when off-canvas. */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-text-muted hover:text-text-primary lg:hidden"
          >
            <IconClose size={16} />
          </button>
        </div>

        <nav className="flex flex-col gap-1 overflow-y-auto" aria-label="Primary">
          {items.map((item) => {
            const Icon = item.Icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.matchPrefix === false}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold transition',
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-nav-icon-inactive hover:bg-secondary/40 hover:text-text-primary',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={18} color={isActive ? '#fff' : 'var(--ohl-nav-icon-inactive)'} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
