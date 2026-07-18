import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';
import type { ChatMessage, MessagesPage } from '@ohlify/api';

import { conversationsQueryKey } from './use-conversations.js';

export const messagesQueryKey = (conversationId: string) => ['messages', conversationId] as const;

/** Messages in a thread, newest first (the UI reverses for display). Polled. */
export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: messagesQueryKey(conversationId),
    enabled: Boolean(conversationId),
    refetchInterval: 5_000,
    queryFn: () =>
      apiClient
        .get(EP.CHAT_MESSAGES(conversationId))
        .json<MessagesPage>()
        .then((r) => r.data),
  });
}

/** Send a message into a thread. */
export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      try {
        const res = await apiClient
          .post(EP.CHAT_MESSAGES(conversationId), { json: { body } })
          .json<{ data: ChatMessage }>();
        return res.data;
      } catch (err) {
        throw await parseApiError(err);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: messagesQueryKey(conversationId) });
      void queryClient.invalidateQueries({ queryKey: conversationsQueryKey() });
    },
  });
}

/** Clear this thread's unread badge. */
export function useMarkRead(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post(EP.CHAT_READ(conversationId)).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: conversationsQueryKey() });
    },
  });
}
