import { apiClient } from '@shared/api/api-client';

import {
  incomingInstantCallFromJson,
  instantCallJoinFromJson,
  type IncomingInstantCall,
  type InstantCallJoin,
} from '../types/instant-call-models';

/** Mirrors mobile/lib/features/instant_calls/instant_calls_api.dart's InstantCallsApiHttp. */
export const instantCallsApi = {
  async start(params: { professionalId: string; callType: string }): Promise<InstantCallJoin> {
    return apiClient.post(
      'instant-calls',
      { professional_id: params.professionalId, call_type: params.callType },
      { fromJson: (data) => instantCallJoinFromJson(data as Record<string, unknown>) },
    ) as Promise<InstantCallJoin>;
  },

  async answer(callId: string): Promise<InstantCallJoin> {
    return apiClient.post(`instant-calls/${callId}/answer`, {}, {
      fromJson: (data) => instantCallJoinFromJson(data as Record<string, unknown>),
    }) as Promise<InstantCallJoin>;
  },

  async end(callId: string, connectedSeconds: number): Promise<void> {
    await apiClient.post(`instant-calls/${callId}/end`, { connected_seconds: connectedSeconds }, { fromJson: () => undefined });
  },

  async incoming(): Promise<IncomingInstantCall | null> {
    return apiClient.get('instant-calls/incoming', {
      fromJson: (data) => (data === null || data === undefined ? null : incomingInstantCallFromJson(data as Record<string, unknown>)),
    }) as Promise<IncomingInstantCall | null>;
  },
};
