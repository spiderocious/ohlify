import { apiClient } from '@shared/api/api-client';

import { notificationPreferencesFromJson, type NotificationPreferences } from '../types/me-models';

/** Mirrors mobile/lib/features/me/notification_prefs_api.dart's NotificationPrefsApiHttp. */
export const notificationPrefsApi = {
  async get(): Promise<NotificationPreferences> {
    return apiClient.get('me/notification-preferences', {
      fromJson: (data) => notificationPreferencesFromJson(data as Record<string, unknown>),
    }) as Promise<NotificationPreferences>;
  },

  async update(params: { sms?: boolean; email?: boolean; push?: boolean }): Promise<NotificationPreferences> {
    return apiClient.patch(
      'me/notification-preferences',
      { sms: params.sms, email: params.email, push: params.push },
      { fromJson: (data) => notificationPreferencesFromJson(data as Record<string, unknown>) },
    ) as Promise<NotificationPreferences>;
  },
};
