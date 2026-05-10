import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';
import type { NotificationPreferences } from '@ohlify/api';

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () =>
      apiClient
        .get(EP.ME_NOTIFICATION_PREFS)
        .json<{ data: NotificationPreferences }>()
        .then((r) => r.data),
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<{ sms: boolean; email: boolean; push: boolean }>) => {
      try {
        await apiClient.patch(EP.ME_NOTIFICATION_PREFS, { json: payload });
      } catch (err) {
        throw await parseApiError(err);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });
}
