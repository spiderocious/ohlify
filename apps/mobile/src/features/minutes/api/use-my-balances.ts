import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@shared/api/query-keys';

import { minutesApi } from './minutes-api';
import type { MinuteBalance } from '../types/minutes-models';

/**
 * Every balance the caller holds, in one request.
 *
 * Per-professional lookups would mean a fetch per call type on every profile
 * opened; the full list is small, and it is already what the client home reads
 * to build "pick up where you left off".
 */
export function useMyBalances() {
  return useQuery({
    queryKey: queryKeys.minutes(),
    queryFn: () => minutesApi.listMyBalances(),
  });
}

/** Seconds held with one professional for one call type, zero when none. */
export function secondsHeldFor(
  balances: MinuteBalance[] | undefined,
  professionalId: string,
  callType: string,
): number {
  return (
    balances?.find((b) => b.professionalId === professionalId && b.callType === callType)
      ?.secondsRemaining ?? 0
  );
}
