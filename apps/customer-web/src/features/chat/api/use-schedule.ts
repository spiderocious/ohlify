import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';
import type { ChatMessage, ScheduleAction } from '@ohlify/api';

import { conversationContextQueryKey } from './use-conversation-context.js';
import { conversationsQueryKey } from './use-conversations.js';
import { messagesQueryKey } from './use-messages.js';

function useRefreshThread(conversationId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: messagesQueryKey(conversationId) });
    void queryClient.invalidateQueries({
      queryKey: conversationContextQueryKey(conversationId),
    });
    void queryClient.invalidateQueries({ queryKey: conversationsQueryKey() });
  };
}

/** Propose a call time in the thread. Either party may schedule. */
export function useProposeSchedule(conversationId: string) {
  const refresh = useRefreshThread(conversationId);
  return useMutation({
    mutationFn: async (input: { scheduled_at: string; note?: string }) => {
      try {
        const res = await apiClient
          .post(EP.CHAT_SCHEDULE(conversationId), { json: input })
          .json<{ data: ChatMessage }>();
        return res.data;
      } catch (err) {
        throw await parseApiError(err);
      }
    },
    onSuccess: refresh,
  });
}

/** Accept / decline / cancel a schedule card. */
export function useScheduleAction(conversationId: string) {
  const refresh = useRefreshThread(conversationId);
  return useMutation({
    mutationFn: async (input: { messageId: string; action: ScheduleAction }) => {
      try {
        const res = await apiClient
          .post(EP.CHAT_SCHEDULE_ACTION(input.messageId), { json: { action: input.action } })
          .json<{ data: ChatMessage }>();
        return res.data;
      } catch (err) {
        throw await parseApiError(err);
      }
    },
    onSuccess: refresh,
  });
}

/** Reschedule (proposer only) — cancels the old card and raises a new one. */
export function useReschedule(conversationId: string) {
  const refresh = useRefreshThread(conversationId);
  return useMutation({
    mutationFn: async (input: { messageId: string; scheduled_at: string; note?: string }) => {
      try {
        const res = await apiClient
          .post(EP.CHAT_SCHEDULE_RESCHEDULE(input.messageId), {
            json: { scheduled_at: input.scheduled_at, note: input.note },
          })
          .json<{ data: ChatMessage }>();
        return res.data;
      } catch (err) {
        throw await parseApiError(err);
      }
    },
    onSuccess: refresh,
  });
}
