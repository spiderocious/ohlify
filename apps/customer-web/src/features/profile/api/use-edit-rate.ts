import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';
import type { Rate } from '@ohlify/api';

export function useEditRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      price_kobo,
      duration_minutes,
    }: {
      id: string;
      price_kobo: number;
      duration_minutes?: number;
    }) => {
      try {
        // PATCH /me/rates/:id accepts duration_minutes too. Omit the key when
        // absent rather than sending undefined — the schema is `.strict()`.
        const res = await apiClient
          .patch(EP.ME_RATE(id), {
            json: duration_minutes === undefined ? { price_kobo } : { price_kobo, duration_minutes },
          })
          .json<{ data: Rate }>();
        return res.data;
      } catch (err) {
        throw await parseApiError(err);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['me-rates'] });
      void queryClient.invalidateQueries({ queryKey: ['kyc-spec'] });
    },
  });
}
