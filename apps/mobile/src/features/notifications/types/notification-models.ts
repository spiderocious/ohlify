/** Mirrors mobile/lib/features/notifications/types/notification_models.dart. */
export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  isRead: boolean;
  deepLink?: string;
  iconKey?: string;
}

export function notificationItemFromJson(json: Record<string, unknown>): NotificationItem {
  return {
    id: json.id as string,
    title: (json.title as string) ?? '',
    body: (json.body as string) ?? '',
    createdAt: (json.created_at as string) ?? new Date().toISOString(),
    isRead: (json.is_read as boolean) ?? false,
    deepLink: json.deep_link as string | undefined,
    iconKey: json.icon_key as string | undefined,
  };
}
