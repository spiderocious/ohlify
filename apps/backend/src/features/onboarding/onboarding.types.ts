import type { UserRole } from '@features/auth/auth.types.js';

export type OnboardingStep =
  | 'role_selection'
  | 'client_kyc'
  | 'professional_kyc'
  // KYC was rejected by admin. User must view the reason and resubmit.
  // Distinct from 'professional_kyc' so the customer client can route to a
  // dedicated rejection screen instead of dropping the user into the same
  // form they previously filled in.
  | 'kyc_rejected'
  | 'complete';

export type IdentityType = 'nin' | 'bvn' | 'passport' | 'drivers_license';

export type KycStatus = 'none' | 'pending_review' | 'approved' | 'rejected';

export interface KycProgress {
  completed_items: string[];
  total_items: number;
  percent: number;
}

/**
 * Set when `step === 'kyc_rejected'`. Carries the latest rejection reason
 * so the client can show the user exactly what to fix. `note` is the
 * free-text admin explanation; `reason_code` is the structured enum.
 *
 * `latest_submission_status` lets the client distinguish two sub-states
 * within `kyc_rejected`:
 *   - 'rejected'        — user hasn't resubmitted yet → show rejection + Resubmit
 *   - 'pending_review'  — user already resubmitted → show "awaiting review"
 *     instead. users.kyc_status stays 'rejected' until admin acts again,
 *     per the "keep history visible until admin re-reviews" policy.
 */
export interface KycRejection {
  reason_code: string;
  note: string | null;
  reviewed_at: string | null;
  submission_id: string;
  latest_submission_status: KycStatus;
}

export interface OnboardingStatus {
  step: OnboardingStep;
  role: UserRole | null;
  kyc_progress: KycProgress;
  kyc_rejection: KycRejection | null;
}

export interface KycSubmissionRow {
  id: string;
  user_id: string;
  identity_type: IdentityType;
  identity_number: string;
  /**
   * File-service key (uuid.ext) for the photo of the ID document. Column
   * name is historical — see migration 0014. Newer rows store keys; older
   * rows may store internal upload-row IDs.
   */
  document_upload_id: string | null;
  /** File-service key for the user's selfie photo. */
  selfie_upload_key: string | null;
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

// Compiled-in fallback list of all known KYC item keys. The actual required
// set per role is driven by platform_config (kyc.professional_items /
// kyc.client_items). Keep this union in lockstep with the seeded migration
// (0061_seed_kyc_items.ts) and api-docs/onboarding-kyc-spec.md.
export const KNOWN_KYC_ITEM_KEYS = [
  'full_name',
  'handle',
  'occupation',
  'description',
  'interests',
  'bank_account',
  'identity',
  'selfie',
  'rates',
] as const;
export type KycItemKey = (typeof KNOWN_KYC_ITEM_KEYS)[number];

// Render-time identifier; tells the frontend which modal/widget to use.
export type KycItemKind =
  | 'text'
  | 'textarea'
  | 'tags'
  | 'handle'
  | 'bank'
  | 'identity'
  | 'selfie'
  | 'rates'
  | 'image_upload';

// Discriminated union of inline-validation rules. The frontend interprets each
// rule for input UX; the backend re-validates on save regardless. New rules
// require both ends to grow together — see docs/admin-kyc-work.md.
export type KycValidationRule =
  | { rule: 'min_length'; value: number; message?: string }
  | { rule: 'max_length'; value: number; message?: string }
  | { rule: 'min_items'; value: number; message?: string }
  | { rule: 'max_items'; value: number; message?: string }
  | { rule: 'regex'; value: string; message?: string }
  | { rule: 'numeric_only'; message?: string }
  | { rule: 'one_of'; value: string[]; message?: string }
  | { rule: 'allowed_extensions'; value: string[]; message?: string }
  | {
      rule: 'allowed_id_methods';
      value: ('nin' | 'bvn' | 'passport' | 'drivers_license')[];
      message?: string;
    }
  | {
      rule: 'id_number_per_method';
      value: Record<string, { rule: 'regex'; value: string }>;
      message?: string;
    };

/**
 * Stored shape (the platform_config value). Per-user `value` and `complete`
 * are layered on at request time inside the spec endpoint.
 */
export interface KycItemConfig {
  key: KycItemKey;
  kind: KycItemKind;
  label: string;
  subtitle: string;
  required: boolean;
  enabled: boolean;
  validation: KycValidationRule[];
}

/** Per-request response shape — config + per-user value + complete flag. */
export interface KycItemSpec extends KycItemConfig {
  value: unknown | null;
  complete: boolean;
}

export interface KycSpecResponse {
  role: UserRole;
  items: KycItemSpec[];
  completed_count: number;
  total_required: number;
  all_complete: boolean;
}

// Legacy: kept temporarily so call sites that still reference the hardcoded
// arrays compile until we migrate them. New code should read from
// platformConfig.kycItems(role) instead.
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
