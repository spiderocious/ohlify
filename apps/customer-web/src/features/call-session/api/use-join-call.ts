import { useMutation } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';
import type { JoinCallResponse } from '@ohlify/api';

export function useJoinCall() {
  return useMutation({
    mutationFn: async (callId: string) => {
      try {
        const res = await apiClient
          .post(EP.CALL_JOIN(callId))
          .json<{ data: JoinCallResponse }>();
        return res.data;
      } catch (err) {
        throw await parseApiError(err);
      }
    },
  });
}
