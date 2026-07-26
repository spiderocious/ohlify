import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@shared/api/api-client';

export interface Badges {
  chatsUnread: number;
  notificationsUnread: number;
  callsUnseen: boolean;
  walletUnseen: boolean;
}

const EMPTY: Badges = {
  chatsUnread: 0,
  notificationsUnread: 0,
  callsUnseen: false,
  walletUnseen: false,
};

function badgesFromJson(json: Record<string, unknown>): Badges {
  return {
    chatsUnread: typeof json.chats_unread === 'number' ? json.chats_unread : 0,
    notificationsUnread:
      typeof json.notifications_unread === 'number' ? json.notifications_unread : 0,
    callsUnseen: json.calls_unseen === true,
    walletUnseen: json.wallet_unseen === true,
  };
}

export const badgesQueryKey = (): string[] => ['badges'];

/**
 * Every badge in one read.
 *
 * No polling interval: SSE invalidates this key when anything moves, and four
 * separate counters on timers is precisely the failure this endpoint exists to
 * avoid. `staleTime: 0` so an invalidation always refetches.
 */
export function useBadges(enabled: boolean) {
  const query = useQuery({
    queryKey: badgesQueryKey(),
    queryFn: () =>
      apiClient.get('me/badges', {
        fromJson: (data) => badgesFromJson(data as Record<string, unknown>),
      }) as Promise<Badges>,
    enabled,
    staleTime: 0,
  });

  return query.data ?? EMPTY;
}

/** Clears a dot by moving that surface's watermark to now. */
export async function markSurfaceSeen(surface: 'calls' | 'wallet'): Promise<void> {
  await apiClient.post(`me/surfaces/${surface}/seen`, {}, { fromJson: () => undefined });
}
