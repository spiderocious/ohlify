import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';
import type { Booking } from '@ohlify/api';
import { idempotencyKey } from '@ohlify/core';

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      callee_user_id: string;
      rate_id: string;
      start_at: string;
    }) => {
      try {
        const res = await apiClient
          .post(EP.BOOKINGS, {
            json: payload,
            headers: { 'Idempotency-Key': idempotencyKey() },
          })
          .json<{ data: Booking }>();
        return res.data;
      } catch (err) {
        throw await parseApiError(err);
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['bookings'] });
      void qc.invalidateQueries({ queryKey: ['calls'] });
      void qc.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}
