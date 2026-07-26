export interface NotificationItem {
  id: string;
  kind: string;
  title: string;
  body: string;
  createdAt: string;
  isRead: boolean;
  /** Encoded `target?key=value`. Resolved via @ohlify/core's decodeDeeplink. */
  deeplink?: string;
  metadata: Record<string, unknown>;
}

export function notificationItemFromJson(json: Record<string, unknown>): NotificationItem {
  return {
    id: json.id as string,
    kind: (json.kind as string) ?? '',
    title: (json.title as string) ?? '',
    body: (json.body as string) ?? '',
    createdAt: (json.created_at as string) ?? new Date().toISOString(),
    isRead: json.read === true,
    deeplink: (json.deeplink as string | null) ?? undefined,
    metadata: (json.metadata as Record<string, unknown>) ?? {},
  };
}
