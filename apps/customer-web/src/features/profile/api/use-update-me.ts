import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';
import type { MeResponse } from '@ohlify/api';

export function useUpdateMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Pick<MeResponse, 'full_name' | 'occupation' | 'description' | 'interests'>>) => {
      try {
        const res = await apiClient
          .patch(EP.ME, { json: payload })
          .json<{ data: MeResponse }>();
        return res.data;
      } catch (err) {
        throw await parseApiError(err);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}
