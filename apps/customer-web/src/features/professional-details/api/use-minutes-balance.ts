import { useQuery } from '@tanstack/react-query';
import { apiClient, EP } from '@ohlify/api';
import type { MinuteBalance } from '@ohlify/api';

export const minutesBalanceQueryKey = (proId: string, callType: 'audio' | 'video') =>
  ['minutes-balance', proId, callType] as const;

/** How many minutes the current user holds with a given pro + call type. */
export function useMinutesBalance(proId: string, callType: 'audio' | 'video', enabled = true) {
  return useQuery({
    queryKey: minutesBalanceQueryKey(proId, callType),
    enabled: enabled && Boolean(proId),
    queryFn: () =>
      apiClient
        .get(EP.ME_MINUTES_BALANCE, {
          searchParams: { professional_id: proId, call_type: callType },
        })
        .json<{ data: MinuteBalance }>()
        .then((r) => r.data),
  });
}
