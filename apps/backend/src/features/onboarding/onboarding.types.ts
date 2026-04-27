import type { UserRole } from '@features/auth/auth.types.js';

export type OnboardingStep = 'role_selection' | 'client_kyc' | 'professional_kyc' | 'complete';

export type IdentityType = 'nin' | 'bvn' | 'passport' | 'drivers_license';

export type KycStatus = 'none' | 'pending_review' | 'approved' | 'rejected';

export interface KycProgress {
  completed_items: string[];
  total_items: number;
  percent: number;
}

export interface OnboardingStatus {
  step: OnboardingStep;
  role: UserRole | null;
  kyc_progress: KycProgress;
}

export interface KycSubmissionRow {
  id: string;
  user_id: string;
  identity_type: IdentityType;
  identity_number: string;
  document_upload_id: string | null;
  status: KycStatus;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  reject_reason_code: string | null;
  reject_note: string | null;
  created_at: Date;
}

export interface HandleRedirectRow {
  old_handle: string;
  user_id: string;
  expires_at: Date;
  created_at: Date;
}

export interface ProfessionalRateRow {
  id: string;
  user_id: string;
  call_type: 'audio' | 'video';
  duration_minutes: number;
  price_kobo: string;
  currency: string;
  created_at: Date;
  deleted_at: Date | null;
}

// Items that count toward completion. Source: docs/onboarding-kyc.md §2 + api-needed.md §5.4.
export const CLIENT_KYC_ITEMS = ['full_name', 'description', 'interests'] as const;
export type ClientKycItem = (typeof CLIENT_KYC_ITEMS)[number];

export const PROFESSIONAL_KYC_ITEMS = [
  'full_name',
  'handle',
  'occupation',
  'description',
  'interests',
  'bank_account',
  'identity',
  'rates',
] as const;
export type ProfessionalKycItem = (typeof PROFESSIONAL_KYC_ITEMS)[number];
