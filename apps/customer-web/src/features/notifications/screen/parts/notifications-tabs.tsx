import type { ReactNode } from 'react';

import { AppTabView } from '@ohlify/ui';

interface NotificationsTabsProps {
  activeIndex: number;
  unreadCount: number;
  allCount: number;
  onTap: (i: number) => void;
  allBody: ReactNode;
  unreadBody: ReactNode;
}

/** Mirrors mobile/lib/features/notifications/screen/parts/notifications_tabs.dart. */
export function NotificationsTabs({
  activeIndex,
  unreadCount,
  allCount,
  onTap,
  allBody,
  unreadBody,
}: NotificationsTabsProps) {
  return (
    <AppTabView
      activeIndex={activeIndex}
      onChange={onTap}
      tabs={[
        { label: `All (${allCount})`, child: allBody },
        { label: `Unread (${unreadCount})`, child: unreadBody },
      ]}
    />
  );
}
