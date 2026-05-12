import { useQuery } from '@tanstack/react-query';
import { apiClient, EP } from '@ohlify/api';
import type { BookingBlocksResponse } from '@ohlify/api';

/**
 * Pro-only fetch of the current "do not book me here" recurring windows.
 * The endpoint returns 403 for non-pro callers, but the screen is
 * gated under the role-aware profile menu so that's a defense-in-depth
 * scenario, not a UX path.
 */
export function useBookingBlocks() {
  return useQuery({
    queryKey: ['me-booking-blocks'],
    queryFn: () =>
      apiClient
        .get(EP.ME_BOOKING_BLOCKS)
        .json<{ data: BookingBlocksResponse }>()
        .then((r) => r.data),
  });
}
