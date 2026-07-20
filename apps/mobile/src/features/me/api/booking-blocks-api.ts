import { apiClient } from '@shared/api/api-client';

import { bookingBlockFromJson, bookingBlockToJson, type BookingBlock } from '../types/me-models';

/**
 * HTTP wrapper for GET /me/booking-blocks and PUT /me/booking-blocks. Saves
 * are full-list overwrites — the server normalizes the payload (sort +
 * merge overlaps), so always re-render from the response. Mirrors
 * mobile/lib/features/me/booking_blocks_api.dart's BookingBlocksApiHttp.
 */
export const bookingBlocksApi = {
  async list(): Promise<BookingBlock[]> {
    return apiClient.get('me/booking-blocks', {
      fromJson: (data) => {
        const list = (data && typeof data === 'object' ? (data as Record<string, unknown>).blocks : undefined) ?? [];
        return (list as unknown[]).map((e) => bookingBlockFromJson(e as Record<string, unknown>));
      },
    }) as Promise<BookingBlock[]>;
  },

  async replace(blocks: BookingBlock[]): Promise<BookingBlock[]> {
    return apiClient.put(
      'me/booking-blocks',
      { blocks: blocks.map(bookingBlockToJson) },
      {
        fromJson: (data) => {
          const list = (data && typeof data === 'object' ? (data as Record<string, unknown>).blocks : undefined) ?? [];
          return (list as unknown[]).map((e) => bookingBlockFromJson(e as Record<string, unknown>));
        },
      },
    ) as Promise<BookingBlock[]>;
  },
};
