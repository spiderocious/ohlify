import { Show } from 'meemaw';
import type { ReactNode } from 'react';

import { cn } from '../../utils/cn.js';
import {
  AppBottomNavBar,
  type AppBottomNavBarItem,
} from '../app-bottom-nav-bar/app-bottom-nav-bar.js';
import { AppSidebar } from '../app-sidebar/app-sidebar.js';

interface AppShellProps {
  /** Tab items shown in both the bottom nav (mobile) and sidebar (desktop). */
  items: AppBottomNavBarItem[];
  currentIndex: number;
  onTap: (index: number) => void;
  /** Optional top header — rendered above content on mobile, hidden on desktop sidebar layout when not provided. */
  header?: ReactNode;
  /** Optional sidebar logo override. */
  sidebarLogo?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Responsive shell.
 *
 * - <lg: header (optional) on top + scrollable content + bottom nav at the
 *        bottom — exactly like mobile/lib/ui/widgets/app_shell/app_shell.dart.
 * - ≥lg: sidebar on the left + scrollable content area on the right.
 */
export function AppShell({
  items,
  currentIndex,
  onTap,
  header,
  sidebarLogo,
  children,
  className,
}: AppShellProps) {
  return (
    <div className={cn('flex h-dvh w-full bg-surface-light text-text-primary', className)}>
      <div className="hidden lg:block">
        <AppSidebar items={items} currentIndex={currentIndex} onTap={onTap} logo={sidebarLogo} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Show when={Boolean(header)}>
          <div>{header}</div>
        </Show>
        <main className="flex-1 overflow-y-auto">{children}</main>
        <div className="lg:hidden">
          <AppBottomNavBar items={items} currentIndex={currentIndex} onTap={onTap} />
        </div>
      </div>
    </div>
  );
}
