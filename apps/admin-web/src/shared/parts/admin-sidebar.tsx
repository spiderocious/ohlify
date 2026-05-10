import { NavLink } from 'react-router-dom';

import { cn } from '@ohlify/ui';

import { visibleNavItems } from '../config/nav-items.js';
import { useCurrentAdmin } from '../auth/use-current-admin.js';

/**
 * Router-aware sidebar. Reuses the same visual tokens as @ohlify/ui's
 * AppSidebar (border-border, nav-background, primary, etc.) but binds to
 * react-router's NavLink so the active state follows the URL — no manual
 * `currentIndex` plumbing.
 */
export function AdminSidebar() {
  const admin = useCurrentAdmin();
  const items = visibleNavItems(admin?.role);

  return (
    <aside
      className="flex h-screen w-60 shrink-0 flex-col gap-1 border-r border-border bg-nav-background px-3 py-6"
      aria-label="Admin navigation"
    >
      <div className="px-3 pb-6">
        <span className="text-2xl font-extrabold text-text-deep-blue">ohlify</span>
        <span className="ml-1.5 align-middle text-[10px] font-bold uppercase tracking-wider text-text-muted">
          admin
        </span>
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
  );
}
