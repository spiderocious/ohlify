import { apiClient } from '@shared/api/api-client';

import {
  authSessionFromJson,
  forgotPasswordVerifiedFromJson,
  otpResentFromJson,
  registrationInitiatedFromJson,
  type AuthSession,
  type ForgotPasswordVerified,
  type OtpChannel,
  type OtpResent,
  type RegistrationInitiated,
} from '../types/auth-models';

/**
 * Pure HTTP layer for the /auth/* and /auth/forgot-password/* endpoints.
 * Mirrors mobile/lib/features/auth/auth_api.dart. All methods return parsed
 * DTOs and throw ApiError on failure.
 */
export const authApi = {
  login(params: { email: string; password: string }): Promise<AuthSession> {
    return apiClient.post('auth/login', params, {
      fromJson: (data) => authSessionFromJson(data as Record<string, unknown>),
    });
  },

  logout(params: { refreshToken: string }): Promise<void> {
    return apiClient.post(
      'auth/logout',
      { refresh_token: params.refreshToken },
      { fromJson: () => undefined },
    );
  },

  registerInitiate(params: {
    email: string;
    phone: string;
    channel: OtpChannel;
  }): Promise<RegistrationInitiated> {
    return apiClient.post(
      'auth/register/initiate',
      { email: params.email, phone: params.phone, channel: params.channel },
      { fromJson: (data) => registrationInitiatedFromJson(data as Record<string, unknown>) },
    );
  },

  registerSetPassword(params: { registrationToken: string; password: string }): Promise<void> {
    return apiClient.post(
      'auth/register/set-password',
      { registration_token: params.registrationToken, password: params.password },
      { fromJson: () => undefined },
    );
  },

  registerVerify(params: { registrationToken: string; otp: string }): Promise<AuthSession> {
    return apiClient.post(
      'auth/register/verify',
      { registration_token: params.registrationToken, otp: params.otp },
      { fromJson: (data) => authSessionFromJson(data as Record<string, unknown>) },
    );
  },

  registerResendOtp(params: { registrationToken: string }): Promise<OtpResent> {
    return apiClient.post(
      'auth/register/resend-otp',
      { registration_token: params.registrationToken },
      { fromJson: (data) => otpResentFromJson(data as Record<string, unknown>) },
    );
  },

  forgotPasswordInitiate(params: { email: string }): Promise<void> {
    return apiClient.post(
      'auth/forgot-password/initiate',
      { email: params.email },
      { fromJson: () => undefined },
    );
  },

  forgotPasswordVerifyOtp(params: { email: string; otp: string }): Promise<ForgotPasswordVerified> {
    return apiClient.post(
      'auth/forgot-password/verify-otp',
      { email: params.email, otp: params.otp },
      { fromJson: (data) => forgotPasswordVerifiedFromJson(data as Record<string, unknown>) },
    );
  },

  forgotPasswordReset(params: { resetToken: string; newPassword: string }): Promise<void> {
    return apiClient.post(
      'auth/forgot-password/reset',
      { reset_token: params.resetToken, new_password: params.newPassword },
      { fromJson: () => undefined },
    );
  },
};
