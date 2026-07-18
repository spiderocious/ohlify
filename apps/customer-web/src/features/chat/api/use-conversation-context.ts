import { useQuery } from '@tanstack/react-query';
import { apiClient, EP } from '@ohlify/api';
import type { ConversationContext } from '@ohlify/api';

export const conversationContextQueryKey = (conversationId: string) =>
  ['conversation-context', conversationId] as const;

/** Peer + remaining minutes + low threshold + live schedule. Drives the
 *  "credits running low / out" banner and the composer's enabled state. */
export function useConversationContext(conversationId: string) {
  return useQuery({
    queryKey: conversationContextQueryKey(conversationId),
    enabled: Boolean(conversationId),
    refetchInterval: 15_000,
    queryFn: () =>
      apiClient
        .get(EP.CHAT_CONTEXT(conversationId))
        .json<{ data: ConversationContext }>()
        .then((r) => r.data),
  });
}
