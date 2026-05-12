import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';

export function useRenameHandle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { handle: string }) => {
      try {
        await apiClient.post(EP.ME_HANDLE, { json: payload });
      } catch (err) {
        throw await parseApiError(err);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}
