import type { Role } from '@ohlify/core';

/**
 * Mirrors mobile/lib/features/auth/types/auth_models.dart. Returned by
 * `POST /auth/login` and `POST /auth/register/verify` so the app can
 * fast-path to the right destination without an extra `/onboarding/status`
 * round-trip.
 *
 * Mirrors the backend's OnboardingStep:
 *   'role_selection' | 'client_kyc' | 'professional_kyc' |
 *   'kyc_rejected' | 'complete' | 'profile'
 * ('profile' is the legacy alias still emitted by register/verify.)
 */
export type OnboardingStep =
  | 'roleSelection'
  | 'clientKyc'
  | 'professionalKyc'
  | 'kycRejected'
  | 'profile'
  | 'complete';

function parseOnboardingStep(raw: string | undefined): OnboardingStep {
  switch (raw) {
    case 'role_selection':
      return 'roleSelection';
    case 'client_kyc':
      return 'clientKyc';
    case 'professional_kyc':
      return 'professionalKyc';
    case 'kyc_rejected':
      return 'kycRejected';
    case 'complete':
      return 'complete';
    case 'profile':
    default:
      return 'profile';
  }
}

function parseRole(raw: string | undefined): Role {
  return raw === 'professional' ? 'professional' : 'client';
}

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  fullName?: string;
}

export function authUserFromJson(json: Record<string, unknown>): AuthUser {
  return {
    id: json.id as string,
    email: json.email as string,
    role: parseRole(json.role as string | undefined),
    fullName: json.full_name as string | undefined,
  };
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  onboardingStep: OnboardingStep;
}

export function authSessionFromJson(json: Record<string, unknown>): AuthSession {
  return {
    user: authUserFromJson(json.user as Record<string, unknown>),
    accessToken: json.access_token as string,
    refreshToken: json.refresh_token as string,
    expiresIn: json.expires_in as number,
    onboardingStep: parseOnboardingStep(json.onboarding_step as string | undefined),
  };
}

export type OtpChannel = 'email' | 'sms';

export interface RegistrationInitiated {
  registrationToken: string;
  otpDestinationMasked: string;
  resendAvailableAt: string;
}

export function registrationInitiatedFromJson(
  json: Record<string, unknown>,
): RegistrationInitiated {
  return {
    registrationToken: json.registration_token as string,
    otpDestinationMasked: json.otp_destination_masked as string,
    resendAvailableAt: json.resend_available_at as string,
  };
}

export interface OtpResent {
  resendAvailableAt: string;
}

export function otpResentFromJson(json: Record<string, unknown>): OtpResent {
  return { resendAvailableAt: json.resend_available_at as string };
}

export interface ForgotPasswordVerified {
  resetToken: string;
}

export function forgotPasswordVerifiedFromJson(
  json: Record<string, unknown>,
): ForgotPasswordVerified {
  return { resetToken: json.reset_token as string };
}
