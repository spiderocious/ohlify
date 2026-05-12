import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      try {
        await apiClient.post(EP.BOOKING_CANCEL(id), { json: reason ? { reason } : {} });
      } catch (err) {
        throw await parseApiError(err);
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['call-history'] });
      void qc.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}
