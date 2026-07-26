import { apiClient } from '@shared/api/api-client';

import {
  incomingInstantCallFromJson,
  instantCallJoinFromJson,
  type IncomingInstantCall,
  type InstantCallJoin,
  callInviteResultFromJson,
  callParticipantFromJson,
  type CallInviteResult,
  type CallParticipant,
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

  /** Stops the server-side meter so a top-up window isn't billed as talk time. */
  async pause(callId: string): Promise<void> {
    await apiClient.post(`instant-calls/${callId}/pause`, {}, { fromJson: () => undefined });
  },

  async resume(callId: string): Promise<void> {
    await apiClient.post(`instant-calls/${callId}/resume`, {}, { fromJson: () => undefined });
  },

  async incoming(): Promise<IncomingInstantCall | null> {
    return apiClient.get('instant-calls/incoming', {
      fromJson: (data) => (data === null || data === undefined ? null : incomingInstantCallFromJson(data as Record<string, unknown>)),
    }) as Promise<IncomingInstantCall | null>;
  },

  async participants(callId: string): Promise<CallParticipant[]> {
    return apiClient.get(`instant-calls/${callId}/participants`, {
      fromJson: (data) =>
        ((data as unknown[]) ?? []).map((e) => callParticipantFromJson(e as Record<string, unknown>)),
    }) as Promise<CallParticipant[]>;
  },

  /** Client-only. The professional still has to approve before anyone is rung. */
  async invite(callId: string, handle: string): Promise<CallInviteResult> {
    return apiClient.post(
      `instant-calls/${callId}/invites`,
      { handle },
      { fromJson: (data) => callInviteResultFromJson(data as Record<string, unknown>) },
    ) as Promise<CallInviteResult>;
  },

  /** The professional's ruling on who gets into their room. */
  async respondToInvite(callId: string, participantId: string, approve: boolean): Promise<void> {
    await apiClient.post(`instant-calls/${callId}/invites/${participantId}`, { approve }, {
      fromJson: () => undefined,
    });
  },

  async respondToRing(callId: string, accept: boolean): Promise<void> {
    await apiClient.post(`instant-calls/${callId}/ring-response`, { accept }, {
      fromJson: () => undefined,
    });
  },
};
