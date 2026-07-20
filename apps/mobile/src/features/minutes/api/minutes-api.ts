import { apiClient } from '@shared/api/api-client';

import { buyMinutesResultFromJson, minuteBalanceFromJson, type BuyMinutesResult, type MinuteBalance } from '../types/minutes-models';

/** Mirrors mobile/lib/features/minutes/minutes_api.dart's MinutesApiHttp. */
export const minutesApi = {
  async listMyBalances(): Promise<MinuteBalance[]> {
    return apiClient.get('me/minutes', {
      fromJson: (data) => (data as unknown[]).map((e) => minuteBalanceFromJson(e as Record<string, unknown>)),
    }) as Promise<MinuteBalance[]>;
  },

  async balanceForPro(professionalId: string, callType: string): Promise<MinuteBalance> {
    return apiClient.get('me/minutes/balance', {
      queryParams: { professional_id: professionalId, call_type: callType },
      fromJson: (data) => minuteBalanceFromJson(data as Record<string, unknown>),
    }) as Promise<MinuteBalance>;
  },

  async buyMinutes(params: { professionalId: string; callType: string; amountKobo: number; idempotencyKey?: string }): Promise<BuyMinutesResult> {
    return apiClient.post(
      'me/minutes',
      { professional_id: params.professionalId, call_type: params.callType, amount_kobo: params.amountKobo },
      { idempotencyKey: params.idempotencyKey, fromJson: (data) => buyMinutesResultFromJson(data as Record<string, unknown>) },
    ) as Promise<BuyMinutesResult>;
  },
};
