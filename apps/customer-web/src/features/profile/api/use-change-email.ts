import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';

export function useChangeEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { new_email: string; otp: string }) => {
      try {
        await apiClient.post(EP.ME_EMAIL, { json: payload });
      } catch (err) {
        throw await parseApiError(err);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}
