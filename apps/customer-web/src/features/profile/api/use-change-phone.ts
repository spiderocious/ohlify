import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';

export function useChangePhone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { new_phone_number: string; otp: string }) => {
      try {
        await apiClient.post(EP.ME_PHONE, { json: payload });
      } catch (err) {
        throw await parseApiError(err);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}
