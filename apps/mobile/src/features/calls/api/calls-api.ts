import { apiClient } from '@shared/api/api-client';

import {
  callHistoryItemFromJson,
  joinCallResponseFromJson,
  renewTokenResponseFromJson,
  type CallHistoryItem,
  type CursorPage,
  type JoinCallResponse,
  type RenewTokenResponse,
} from '../types/call-models';

/** Mirrors mobile/lib/features/calls/calls_api.dart's CallsApiHttp. */
export const callsApi = {
  async getHistory(params?: { cursor?: string; limit?: number }): Promise<CursorPage<CallHistoryItem>> {
    return apiClient.get('calls/history', {
      queryParams: { limit: params?.limit ?? 20, cursor: params?.cursor },
      fromJson: (data) => {
        const map = data as Record<string, unknown>;
        const items = (Array.isArray(map.data) ? map.data : []).map((e) => callHistoryItemFromJson(e as Record<string, unknown>));
        const meta = (map.meta as Record<string, unknown>) ?? {};
        return {
          items,
          nextCursor: meta.next_cursor as string | undefined,
          hasMore: (meta.has_more as boolean) ?? false,
        };
      },
    }) as Promise<CursorPage<CallHistoryItem>>;
  },

  async getHistoryItem(id: string): Promise<CallHistoryItem> {
    return apiClient.get(`calls/history/${id}`, {
      fromJson: (data) => callHistoryItemFromJson(data as Record<string, unknown>),
    }) as Promise<CallHistoryItem>;
  },

  async join(callId: string): Promise<JoinCallResponse> {
    return apiClient.post(`calls/${callId}/join`, {}, {
      fromJson: (data) => joinCallResponseFromJson(data as Record<string, unknown>),
    }) as Promise<JoinCallResponse>;
  },

  async renewToken(callId: string): Promise<RenewTokenResponse> {
    return apiClient.post(`calls/${callId}/renew-token`, {}, {
      fromJson: (data) => renewTokenResponseFromJson(data as Record<string, unknown>),
    }) as Promise<RenewTokenResponse>;
  },

  async leave(callId: string, params?: { reason?: string; clientDurationSeconds?: number }): Promise<void> {
    await apiClient.post(
      `calls/${callId}/leave`,
      { reason: params?.reason, client_duration_seconds: params?.clientDurationSeconds },
      { fromJson: () => undefined },
    );
  },

  /** Backend schema is `.strict()` — must send { rating, feedback_text }, not { stars, comment }. */
  async submitRating(params: { callId: string; stars: number; comment?: string }): Promise<void> {
    await apiClient.post(
      `calls/${params.callId}/rating`,
      { rating: params.stars, feedback_text: params.comment },
      { fromJson: () => undefined },
    );
  },
};
