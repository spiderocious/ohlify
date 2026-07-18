import { IconCalendarDay, IconChat, IconHome, IconUser, IconWallet, type LucideIcon } from '@icons';

import { cn } from '../../utils/cn.js';

export interface AppBottomNavBarItem {
  /** Lucide icon component. Apps can swap to a custom SVG via the `icon` prop. */
  Icon: LucideIcon;
  label: string;
}

interface AppBottomNavBarProps {
  items: AppBottomNavBarItem[];
  currentIndex: number;
  onTap: (index: number) => void;
  className?: string;
}

/**
 * Mirrors mobile/lib/ui/widgets/app_bottom_nav_bar/app_bottom_nav_bar.dart.
 * 68px tall row, lavender bg (--ohl-nav-background). Active item is a primary
 * pill with icon + label; inactive items show only the muted icon.
 */
export function AppBottomNavBar({ items, currentIndex, onTap, className }: AppBottomNavBarProps) {
  return (
    <nav
      aria-label="Primary"
      className={cn('w-full bg-nav-background', className)}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex h-[68px] items-center">
        {items.map((item, i) => {
          const active = i === currentIndex;
          const Icon = item.Icon;
          return (
            <li key={i} className="flex flex-1 items-center justify-center">
              <button
                type="button"
                onClick={() => onTap(i)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex items-center gap-2 rounded-pill transition-all duration-220 ease-out',
                  active ? 'bg-primary px-5 py-2.5 text-white' : 'p-2.5 text-nav-icon-inactive',
                )}
              >
                <Icon size={22} color={active ? '#fff' : 'var(--ohl-nav-icon-inactive)'} />
                {active ? (
                  <span className="text-sm font-semibold text-white">{item.label}</span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Pre-built items matching the app's 4 main tabs. */
export const appMainNavItems: AppBottomNavBarItem[] = [
  { Icon: IconHome, label: 'Home' },
  { Icon: IconCalendarDay, label: 'Calls' },
  { Icon: IconChat, label: 'Chats' },
  { Icon: IconWallet, label: 'Wallet' },
  { Icon: IconUser, label: 'Profile' },
];
