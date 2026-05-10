import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';
import type { Rate } from '@ohlify/api';

export function useEditRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, price_kobo }: { id: string; price_kobo: number }) => {
      try {
        const res = await apiClient
          .patch(EP.ME_RATE(id), { json: { price_kobo } })
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
