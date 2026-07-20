/** Mirrors mobile/lib/features/bookings/types/booking_models.dart. */
export interface BookingResponse {
  id: string;
  callId: string;
  callType: string;
  startAt: string;
  endAt: string;
  priceKobo: number;
  status: string;
}

export function bookingResponseFromJson(json: Record<string, unknown>): BookingResponse {
  return {
    id: json.id as string,
    callId: (json.call_id as string) ?? '',
    callType: (json.call_type as string) ?? 'audio',
    startAt: (json.start_at as string) ?? new Date().toISOString(),
    endAt: (json.end_at as string) ?? new Date().toISOString(),
    priceKobo: typeof json.price_kobo === 'number' ? json.price_kobo : 0,
    status: (json.status as string) ?? 'confirmed',
  };
}
