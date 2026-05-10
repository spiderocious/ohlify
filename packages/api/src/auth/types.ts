// Re-export OnboardingStep from the canonical onboarding types file so
// auth + onboarding can never drift. Login + register-verify responses
// carry the same OnboardingStep that GET /onboarding/status uses.
import type { OnboardingStep } from '../onboarding/types.js';

export type { OnboardingStep };

export interface AuthUser {
  id: string;
  email: string;
  role: 'client' | 'professional';
  full_name: string | null;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface LoginResponse extends AuthTokens {
  user: AuthUser;
  onboarding_step: OnboardingStep;
}

export interface RegisterVerifyResponse extends AuthTokens {
  user: AuthUser;
  onboarding_step: OnboardingStep;
}

export interface RegisterInitiateResponse {
  registration_token: string;
  otp_destination_masked: string;
  resend_available_at: string;
}
