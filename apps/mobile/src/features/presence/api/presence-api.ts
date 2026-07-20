import { apiClient } from '@shared/api/api-client';

/**
 * Mirrors mobile/lib/features/presence/presence_api.dart. Pure HTTP layer —
 * the heartbeat call itself is fire-and-forget by design (see
 * providers/heartbeat-provider.tsx), so this just exposes the request.
 */
export const presenceApi = {
  heartbeat(): Promise<void> {
    return apiClient.post('me/presence/heartbeat', {}, { fromJson: () => undefined });
  },
};
