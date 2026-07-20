import { apiClient } from '@shared/api/api-client';

import type { CursorPage } from '@features/calls/types/call-models';

import { notificationItemFromJson, type NotificationItem } from '../types/notification-models';

/** Mirrors mobile/lib/features/notifications/notifications_api.dart's NotificationsApiHttp. */
export const notificationsApi = {
  async list(params?: { cursor?: string; limit?: number; unreadOnly?: boolean }): Promise<CursorPage<NotificationItem>> {
    return apiClient.get('notifications', {
      queryParams: { limit: params?.limit ?? 20, cursor: params?.cursor, unread_only: params?.unreadOnly ?? false },
      fromJson: (data) => {
        const map = data as Record<string, unknown>;
        const items = (Array.isArray(map.data) ? map.data : []).map((e) => notificationItemFromJson(e as Record<string, unknown>));
        const meta = (map.meta as Record<string, unknown>) ?? {};
        return { items, nextCursor: meta.next_cursor as string | undefined, hasMore: (meta.has_more as boolean) ?? false };
      },
    }) as Promise<CursorPage<NotificationItem>>;
  },

  async markRead(id: string): Promise<void> {
    await apiClient.post(`notifications/${id}/read`, {}, { fromJson: () => undefined });
  },

  async markAllRead(): Promise<void> {
    await apiClient.post('notifications/read-all', {}, { fromJson: () => undefined });
  },
};
