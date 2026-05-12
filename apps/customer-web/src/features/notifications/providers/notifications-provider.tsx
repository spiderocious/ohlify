import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { MOCK_NOTIFICATIONS, type AppNotification } from '@ohlify/core';

interface NotificationsContextValue {
  all: ReadonlyArray<AppNotification>;
  unread: ReadonlyArray<AppNotification>;
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<AppNotification[]>(() => MOCK_NOTIFICATIONS.map((n) => ({ ...n })));

  const value = useMemo<NotificationsContextValue>(() => {
    const unread = items.filter((n) => !n.read);
    return {
      all: items,
      unread,
      unreadCount: unread.length,
      markAsRead: (id) =>
        setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n))),
      markAllAsRead: () => setItems((prev) => prev.map((n) => ({ ...n, read: true }))),
    };
  }, [items]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider');
  return ctx;
}
