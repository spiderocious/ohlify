import { useMutation } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';

export function useRenewCallToken(callId: string) {
  return useMutation({
    mutationFn: async () => {
      try {
        const res = await apiClient
          .post(EP.CALL_RENEW_TOKEN(callId))
          .json<{ data: { agora_token: string; expires_at: string } }>();
        return res.data;
      } catch (err) {
        throw await parseApiError(err);
      }
    },
  });
}
