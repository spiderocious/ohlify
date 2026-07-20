import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ApiError } from '@shared/types/api-error';

import { notificationsApi } from '../api/notifications-api';
import type { NotificationItem } from '../types/notification-models';
import type { AppNotification } from '../types/app-notification';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays > 30) return `${Math.floor(diffDays / 30)} months ago`;
  if (diffDays > 0) return `${diffDays} days ago`;
  const diffHours = Math.floor(diffMs / 3_600_000);
  if (diffHours > 0) return `${diffHours} hours ago`;
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes > 0) return `${diffMinutes} minutes ago`;
  return 'just now';
}

function adapt(n: NotificationItem): AppNotification {
  return { id: n.id, kind: 'system', title: n.title, message: n.body, timeLabel: timeAgo(n.createdAt), read: n.isRead, route: n.deepLink };
}

/**
 * Backed by GET /notifications (cursor-paginated). Mirrors
 * mobile/lib/features/notifications/providers/notifications_notifier.dart.
 * Adapts the backend NotificationItem (no `kind` enum) onto the UI's
 * AppNotification — everything defaults to 'system' until the backend
 * ships kind metadata.
 */
export function useNotifications() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [error, setError] = useState<ApiError | undefined>(undefined);
  const cursorRef = useRef<string | undefined>(undefined);
  cursorRef.current = nextCursor;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const page = await notificationsApi.list();
      setItems(page.items.map(adapt));
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
      setInitialLoaded(true);
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.network);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !cursorRef.current) return;
    setLoading(true);
    try {
      const page = await notificationsApi.list({ cursor: cursorRef.current });
      setItems((prev) => [...prev, ...page.items.map(adapt)]);
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.network);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore]);

  const markAsRead = useCallback(async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await notificationsApi.markRead(id);
    } catch {
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n)));
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    let snapshot: AppNotification[] = [];
    setItems((prev) => {
      snapshot = prev;
      return prev.map((n) => ({ ...n, read: true }));
    });
    try {
      await notificationsApi.markAllRead();
    } catch {
      setItems(snapshot);
    }
  }, []);

  const unread = useMemo(() => items.filter((n) => !n.read), [items]);
  const unreadCount = unread.length;
  const isEmpty = items.length === 0 && initialLoaded;

  return { all: items, unread, unreadCount, isEmpty, isLoading: loading, hasMore, error, refresh, loadMore, markAsRead, markAllAsRead };
}
