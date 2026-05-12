import { useQuery } from '@tanstack/react-query';
import { apiClient, EP } from '@ohlify/api';
import type { AvailabilityResponse } from '@ohlify/api';

interface AvailabilityParams {
  from?: string;
  to?: string;
  call_type?: 'audio' | 'video';
  duration_minutes?: number;
  tz?: string;
}

export function useAvailability(professionalId: string, params: AvailabilityParams = {}) {
  const searchParams: Record<string, string> = {};
  if (params.from) searchParams['from'] = params.from;
  if (params.to) searchParams['to'] = params.to;
  if (params.call_type) searchParams['call_type'] = params.call_type;
  if (params.duration_minutes !== undefined)
    searchParams['duration_minutes'] = String(params.duration_minutes);
  if (params.tz) searchParams['tz'] = params.tz;

  return useQuery({
    queryKey: ['availability', professionalId, params],
    queryFn: () =>
      apiClient
        .get(EP.PROFESSIONAL_AVAILABILITY(professionalId), { searchParams })
        .json<{ data: AvailabilityResponse }>()
        .then((r) => r.data),
    staleTime: 0,
    enabled: Boolean(professionalId),
  });
}
