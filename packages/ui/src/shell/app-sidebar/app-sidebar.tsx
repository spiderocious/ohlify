import type { LucideIcon } from '@icons';

import { cn } from '../../utils/cn.js';

export interface AppSidebarItem {
  Icon: LucideIcon;
  label: string;
}

interface AppSidebarProps {
  items: AppSidebarItem[];
  currentIndex: number;
  onTap: (index: number) => void;
  /** Logo node rendered above the items. */
  logo?: React.ReactNode;
  className?: string;
}

/**
 * Desktop counterpart to AppBottomNavBar. Renders at ≥lg only — apps mount
 * both and toggle visibility via responsive classes (see AppShell).
 */
export function AppSidebar({ items, currentIndex, onTap, logo, className }: AppSidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-screen w-60 shrink-0 flex-col gap-1 border-r border-border bg-nav-background px-3 py-6',
        className,
      )}
    >
      <div className="px-3 pb-6">
        {logo ?? <span className="text-2xl font-extrabold text-text-deep-blue">ohlify</span>}
      </div>
      <nav aria-label="Primary" className="flex flex-col gap-1">
        {items.map((item, i) => {
          const active = i === currentIndex;
          const Icon = item.Icon;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onTap(i)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold transition',
                active
                  ? 'bg-primary text-white'
                  : 'text-nav-icon-inactive hover:bg-secondary/40 hover:text-text-primary',
              )}
            >
              <Icon size={18} color={active ? '#fff' : 'var(--ohl-nav-icon-inactive)'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
