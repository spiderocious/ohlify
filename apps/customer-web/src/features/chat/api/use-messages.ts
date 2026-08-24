import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';
import type { ChatMessage, MessagesPage } from '@ohlify/api';

import { conversationsQueryKey } from './use-conversations.js';

export const messagesQueryKey = (conversationId: string) => ['messages', conversationId] as const;

/**
 * A message that exists only in the cache, awaiting its round trip.
 *
 * `pending` and `failed` are client-side and never come from the API — the
 * server has no notion of a message it has not accepted yet.
 */
export interface PendingChatMessage extends ChatMessage {
  pending?: boolean;
  failed?: boolean;
}

/** Ids for optimistic rows. Prefixed so they can never collide with a real id. */
let nextPendingId = 0;

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

/**
 * Send a message into a thread, optimistically.
 *
 * The message is written into the cache before the request leaves, so it
 * appears the instant it is sent rather than after a round trip. Until the
 * server confirms it, the placeholder carries `pending`, which the thread
 * renders dimmed with a clock; on failure it flips to `failed` and stays on
 * screen with its text intact so it can be retried.
 *
 * That last part is the point. The previous version cleared the composer and
 * then fired the request, so a send that failed took the user's typed message
 * with it and left only a toast that faded — the one moment where losing
 * written text is least forgivable.
 */
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

    onMutate: async (body: string) => {
      const key = messagesQueryKey(conversationId);
      // Stop an in-flight poll from landing on top of the placeholder.
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ChatMessage[]>(key);

      const optimistic: PendingChatMessage = {
        id: `pending:${String(nextPendingId++)}`,
        conversation_id: conversationId,
        sender_user_id: '',
        mine: true,
        body,
        kind: 'text',
        scheduled_at: null,
        schedule_status: null,
        can_accept: false,
        can_decline: false,
        can_reschedule: false,
        can_cancel: false,
        created_at: new Date().toISOString(),
        pending: true,
      };

      // The list is newest-first, so a new message goes at the head.
      queryClient.setQueryData<ChatMessage[]>(key, [optimistic, ...(previous ?? [])]);
      return { previous, optimisticId: optimistic.id };
    },

    onError: (_err, _body, ctx) => {
      if (!ctx) return;
      // Mark the placeholder failed rather than removing it — a message that
      // vanishes on error is indistinguishable from one that was sent.
      queryClient.setQueryData<ChatMessage[]>(messagesQueryKey(conversationId), (current) =>
        (current ?? []).map((m) =>
          m.id === ctx.optimisticId ? { ...m, pending: false, failed: true } : m,
        ),
      );
    },

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: messagesQueryKey(conversationId) });
      void queryClient.invalidateQueries({ queryKey: conversationsQueryKey() });
    },
  });
}

/** Drop a failed placeholder — used when its retry succeeds, or on dismiss. */
export function useDiscardMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return (messageId: string) => {
    queryClient.setQueryData<ChatMessage[]>(messagesQueryKey(conversationId), (current) =>
      (current ?? []).filter((m) => m.id !== messageId),
    );
  };
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
