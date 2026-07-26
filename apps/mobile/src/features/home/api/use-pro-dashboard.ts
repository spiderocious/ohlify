import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { profileApi } from '@features/profile/api/profile-api';
import { apiClient } from '@shared/api/api-client';
import { queryKeys } from '@shared/api/query-keys';

export interface ProRecentCall {
  id: string;
  callType: string;
  status: string;
  connectedSeconds: number;
  /** Net of the platform fee — what the professional actually kept. */
  earnedKobo: number;
  peerName?: string;
  peerAvatarKey?: string;
  createdAt: string;
}

export interface ProSeriesPoint {
  day: string;
  calls: number;
  seconds: number;
  earnedKobo: number;
}

export interface ProDashboard {
  isAvailable: boolean;
  kycStatus: string;
  kycRejectReason?: string;
  earnings: { todayKobo: number; weekKobo: number; withdrawableKobo: number };
  attention: { unreadMessages: number; pendingSchedules: number; missedCallsToday: number };
  recentCalls: ProRecentCall[];
  series: ProSeriesPoint[];
}

const num = (v: unknown): number => (typeof v === 'number' ? v : 0);

function fromJson(json: Record<string, unknown>): ProDashboard {
  const earnings = (json.earnings as Record<string, unknown>) ?? {};
  const attention = (json.attention as Record<string, unknown>) ?? {};
  return {
    isAvailable: json.is_available === true,
    kycStatus: (json.kyc_status as string) ?? 'none',
    kycRejectReason: (json.kyc_reject_reason as string) ?? undefined,
    earnings: {
      todayKobo: num(earnings.today_kobo),
      weekKobo: num(earnings.week_kobo),
      withdrawableKobo: num(earnings.withdrawable_kobo),
    },
    attention: {
      unreadMessages: num(attention.unread_messages),
      pendingSchedules: num(attention.pending_schedules),
      missedCallsToday: num(attention.missed_calls_today),
    },
    recentCalls: (Array.isArray(json.recent_calls) ? json.recent_calls : []).map((raw) => {
      const c = raw as Record<string, unknown>;
      return {
        id: c.id as string,
        callType: (c.call_type as string) ?? 'audio',
        status: (c.status as string) ?? 'ended',
        connectedSeconds: num(c.connected_seconds),
        earnedKobo: num(c.earned_kobo),
        peerName: (c.peer_name as string) ?? undefined,
        peerAvatarKey: (c.peer_avatar_url as string) ?? undefined,
        createdAt: (c.created_at as string) ?? '',
      };
    }),
    series: (Array.isArray(json.series) ? json.series : []).map((raw) => {
      const p = raw as Record<string, unknown>;
      return {
        day: (p.day as string) ?? '',
        calls: num(p.calls),
        seconds: num(p.seconds),
        earnedKobo: num(p.earned_kobo),
      };
    }),
  };
}

export const proDashboardQueryKey = (days: number): (string | number)[] => [
  'home',
  'pro-dashboard',
  days,
];

export function useProDashboard(days: 7 | 30, enabled: boolean) {
  return useQuery({
    queryKey: proDashboardQueryKey(days),
    queryFn: () =>
      apiClient.get('me/dashboard', {
        queryParams: { days },
        fromJson: (data) => fromJson(data as Record<string, unknown>),
      }) as Promise<ProDashboard>,
    enabled,
  });
}

/**
 * Flips the availability switch.
 *
 * Optimistic because the toggle is the professional's most-used control and a
 * round-trip lag on a switch reads as broken. Rolls back on failure so the UI
 * never claims a state the server rejected.
 */
export function useSetAvailability(days: 7 | 30) {
  const queryClient = useQueryClient();
  const key = proDashboardQueryKey(days);

  return useMutation({
    mutationFn: (isAvailable: boolean) => profileApi.updateMe({ isAvailable }),
    onMutate: async (isAvailable) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ProDashboard>(key);
      if (previous) queryClient.setQueryData<ProDashboard>(key, { ...previous, isAvailable });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: queryKeys.me() }),
  });
}
