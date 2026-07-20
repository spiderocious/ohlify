import { apiClient } from '@shared/api/api-client';

import { meResponseFromJson, type MeResponse } from '../types/me-response';

/** Sensitive-action OTP types — anything that needs an OTP gate before the real mutation runs. */
export type SensitiveAction = 'change_email' | 'change_phone' | 'change_password' | 'delete_account';

export interface SensitiveOtpRequested {
  destinationMasked: string;
}

function sensitiveOtpRequestedFromJson(json: Record<string, unknown>): SensitiveOtpRequested {
  return { destinationMasked: (json.otp_destination_masked as string) ?? '' };
}

/**
 * Pure HTTP layer for /me. Mirrors mobile/lib/features/profile/profile_api.dart.
 */
export const profileApi = {
  getMe(): Promise<MeResponse> {
    return apiClient.get('me', {
      fromJson: (data) => meResponseFromJson(data as Record<string, unknown>),
    });
  },

  updateMe(params: {
    fullName?: string;
    occupation?: string;
    description?: string;
    interests?: string[];
    categories?: string[];
    isAvailable?: boolean;
  }): Promise<MeResponse> {
    return apiClient.patch(
      'me',
      {
        full_name: params.fullName,
        occupation: params.occupation,
        description: params.description,
        interests: params.interests,
        categories: params.categories,
        is_available: params.isAvailable,
      },
      { fromJson: (data) => meResponseFromJson(data as Record<string, unknown>) },
    );
  },

  updateAvatar(params: { fileKey: string }): Promise<MeResponse> {
    return apiClient.post('me/avatar', { file_key: params.fileKey }, { fromJson: (data) => meResponseFromJson(data as Record<string, unknown>) });
  },

  requestSensitiveOtp(action: SensitiveAction): Promise<SensitiveOtpRequested> {
    return apiClient.post('me/sensitive-action/otp', { action }, { fromJson: (data) => sensitiveOtpRequestedFromJson(data as Record<string, unknown>) });
  },

  async changeEmail(params: { newEmail: string; otp: string }): Promise<void> {
    await apiClient.post('me/email', { new_email: params.newEmail, otp: params.otp }, { fromJson: () => undefined });
  },

  async changePhone(params: { newPhone: string; otp: string }): Promise<void> {
    await apiClient.post('me/phone', { new_phone_number: params.newPhone, otp: params.otp }, { fromJson: () => undefined });
  },

  /** Note: backend revokes all sessions on success — caller MUST re-route to login after. */
  async changePassword(params: { currentPassword: string; newPassword: string; otp: string }): Promise<void> {
    await apiClient.post(
      'me/password',
      { current_password: params.currentPassword, new_password: params.newPassword, otp: params.otp },
      { fromJson: () => undefined },
    );
  },

  /** Soft-delete the account. Backend revokes all sessions on success. */
  async deleteAccount(params: { otp: string }): Promise<void> {
    await apiClient.delete('me', { body: { otp: params.otp, confirm: true }, fromJson: () => undefined });
  },
};
