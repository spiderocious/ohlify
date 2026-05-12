import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';

export function useLeaveCall(callId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload?: { reason?: 'hangup' | 'declined' | 'error'; client_duration_seconds?: number }) => {
      try {
        await apiClient.post(EP.CALL_LEAVE(callId), { json: payload ?? {} });
      } catch (err) {
        throw await parseApiError(err);
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['call', callId] });
      void qc.invalidateQueries({ queryKey: ['calls'] });
      void qc.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}
