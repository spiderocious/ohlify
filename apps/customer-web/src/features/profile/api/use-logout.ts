import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, EP, session, parseApiError } from '@ohlify/api';

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const refreshToken = session.getRefresh();
      try {
        if (refreshToken) {
          await apiClient.post(EP.AUTH_LOGOUT, { json: { refresh_token: refreshToken } });
        }
      } catch (err) {
        throw await parseApiError(err);
      } finally {
        session.clear();
        queryClient.clear();
      }
    },
  });
}
