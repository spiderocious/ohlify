import { useMutation } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';
import type { OpenConversationResult } from '@ohlify/api';

/** Open (or resume) a thread with a pro. Backend gates on minutes > 0. */
export function useOpenConversation() {
  return useMutation({
    mutationFn: async (professionalId: string) => {
      try {
        const res = await apiClient
          .post(EP.CHAT_CONVERSATIONS, { json: { professional_id: professionalId } })
          .json<{ data: OpenConversationResult }>();
        return res.data;
      } catch (err) {
        throw await parseApiError(err);
      }
    },
  });
}
