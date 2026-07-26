import { apiClient } from '@shared/api/api-client';

import type { CursorPage } from '@features/calls/types/call-models';

import { notificationItemFromJson, type NotificationItem } from '../types/notification-models';

export const notificationsQueryKey = (): string[] => ['notifications'];

export const notificationsApi = {
  async list(params?: { cursor?: string; limit?: number }): Promise<CursorPage<NotificationItem>> {
    return apiClient.get('me/notifications', {
      queryParams: { limit: params?.limit ?? 20, cursor: params?.cursor },
      fromJson: (data) => {
        const map = data as Record<string, unknown>;
        const items = (Array.isArray(map.items) ? map.items : []).map((e) =>
          notificationItemFromJson(e as Record<string, unknown>),
        );
        const meta = (map.meta as Record<string, unknown>) ?? {};
        return {
          items,
          nextCursor: (meta.next_cursor as string | null) ?? undefined,
          hasMore: (meta.has_more as boolean) ?? false,
        };
      },
    }) as Promise<CursorPage<NotificationItem>>;
  },

  async markRead(id: string): Promise<void> {
    await apiClient.post(`me/notifications/${id}/read`, {}, { fromJson: () => undefined });
  },

  async markAllRead(): Promise<void> {
    await apiClient.post('me/notifications/read-all', {}, { fromJson: () => undefined });
  },
};
