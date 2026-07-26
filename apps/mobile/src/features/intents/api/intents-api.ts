import type { IntentRequirement, IntentView } from '@ohlify/core';

import { apiClient } from '@shared/api/api-client';

import { intentViewFromJson } from '../types/intent-models';

/**
 * Purchase intents. The client declares what it needs and asks the server
 * whether it has it — it never reports having satisfied anything itself, which
 * is what keeps a failed or abandoned flow from unlocking a guarded action.
 */
export const intentsApi = {
  async create(requirement: IntentRequirement): Promise<IntentView> {
    return apiClient.post('intents', requirement, {
      fromJson: (data) => intentViewFromJson(data as Record<string, unknown>),
    }) as Promise<IntentView>;
  },

  async get(ref: string): Promise<IntentView> {
    return apiClient.get(`intents/${ref}`, {
      fromJson: (data) => intentViewFromJson(data as Record<string, unknown>),
    }) as Promise<IntentView>;
  },

  /** Re-measures the condition server-side. The only thing that can satisfy an intent. */
  async verify(ref: string): Promise<IntentView> {
    return apiClient.post(`intents/${ref}/verify`, {}, {
      fromJson: (data) => intentViewFromJson(data as Record<string, unknown>),
    }) as Promise<IntentView>;
  },

  async cancel(ref: string): Promise<IntentView> {
    return apiClient.post(`intents/${ref}/cancel`, {}, {
      fromJson: (data) => intentViewFromJson(data as Record<string, unknown>),
    }) as Promise<IntentView>;
  },
};
