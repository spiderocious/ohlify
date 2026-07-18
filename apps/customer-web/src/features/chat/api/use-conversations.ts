import { useQuery } from '@tanstack/react-query';
import { apiClient, EP } from '@ohlify/api';
import type { ConversationsPage } from '@ohlify/api';

export const conversationsQueryKey = () => ['conversations'] as const;

/** The current user's chat threads, newest activity first. Polled for freshness. */
export function useConversations() {
  return useQuery({
    queryKey: conversationsQueryKey(),
    refetchInterval: 15_000,
    queryFn: () =>
      apiClient
        .get(EP.CHAT_CONVERSATIONS)
        .json<ConversationsPage>()
        .then((r) => r.data),
  });
}
