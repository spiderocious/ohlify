import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, EP, parseApiError } from '@ohlify/api';
import type { BookingBlock, BookingBlocksResponse } from '@ohlify/api';

/**
 * Replaces the entire block list with [blocks]. The server normalizes
 * (sort + merge overlaps) so the response may be slimmer than what was
 * sent — we always trust the response over local form state.
 *
 * Invalidates `availability` queries too so the schedule-call screen
 * picks up the new exclusions immediately if the pro is testing across
 * tabs / devices.
 */
export function useUpdateBookingBlocks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (blocks: BookingBlock[]) => {
      try {
        const res = await apiClient
          .put(EP.ME_BOOKING_BLOCKS, { json: { blocks } })
          .json<{ data: BookingBlocksResponse }>();
        return res.data;
      } catch (err) {
        throw await parseApiError(err);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['me-booking-blocks'] });
      void queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}
