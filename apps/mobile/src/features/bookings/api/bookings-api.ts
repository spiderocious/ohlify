import { apiClient } from '@shared/api/api-client';

import { bookingResponseFromJson, type BookingResponse } from '../types/booking-models';

/** Mirrors mobile/lib/features/bookings/bookings_api.dart's BookingsApiHttp. */
export const bookingsApi = {
  async create(params: { calleeUserId: string; rateId: string; startAt: string; idempotencyKey: string }): Promise<BookingResponse> {
    return apiClient.post(
      'bookings',
      { callee_user_id: params.calleeUserId, rate_id: params.rateId, start_at: params.startAt },
      { idempotencyKey: params.idempotencyKey, fromJson: (data) => bookingResponseFromJson(data as Record<string, unknown>) },
    ) as Promise<BookingResponse>;
  },

  async cancel(bookingId: string): Promise<void> {
    await apiClient.post(`bookings/${bookingId}/cancel`, {}, { fromJson: () => undefined });
  },
};
