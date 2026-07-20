import { apiClient } from '@shared/api/api-client';

import { rateFromJson, type Rate } from '../types/me-models';

/** Mirrors mobile/lib/features/me/rates_api.dart's RatesApiHttp. */
export const ratesApi = {
  listMyRates(): Promise<Rate[]> {
    return apiClient.get('me/rates', {
      fromJson: (data) => (data as unknown[]).map((e) => rateFromJson(e as Record<string, unknown>)),
    });
  },

  addRate(params: { callType: string; durationMinutes: number; priceKobo: number }): Promise<Rate> {
    return apiClient.post(
      'me/rates',
      { call_type: params.callType, duration_minutes: params.durationMinutes, price_kobo: params.priceKobo },
      { fromJson: (data) => rateFromJson(data as Record<string, unknown>) },
    );
  },

  editRate(params: { id: string; priceKobo: number }): Promise<Rate> {
    return apiClient.patch(
      `me/rates/${params.id}`,
      { price_kobo: params.priceKobo },
      { fromJson: (data) => rateFromJson(data as Record<string, unknown>) },
    );
  },

  deleteRate(id: string): Promise<void> {
    return apiClient.delete(`me/rates/${id}`, { fromJson: () => undefined });
  },
};
