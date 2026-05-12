export type OnboardingStep =
  | 'role_selection'
  | 'client_kyc'
  | 'professional_kyc'
  // Set when admin has rejected the user's KYC. Client routes to a
  // dedicated rejection screen showing the reason + a Resubmit CTA.
  | 'kyc_rejected'
  | 'complete';

export type KycStatus = 'none' | 'pending_review' | 'approved' | 'rejected';

export interface KycProgress {
  completed_items: string[];
  total_items: number;
  percent: number;
}

/**
 * Populated when `step === 'kyc_rejected'`.
 *
 * `latest_submission_status` distinguishes two sub-states within
 * 'kyc_rejected':
 *   - 'rejected'        — user hasn't resubmitted yet → show rejection + Resubmit
 *   - 'pending_review'  — user already resubmitted → show "awaiting review" UI
 *
 * `users.kyc_status` stays at 'rejected' until admin re-reviews, so the
 * client can't rely on `step` alone to switch UI state after a resubmit.
 */
export interface KycRejection {
  reason_code: string;
  note: string | null;
  reviewed_at: string | null;
  submission_id: string;
  latest_submission_status: KycStatus;
  /**
   * Per-item resubmission set. Empty array = whole-submission rejection
   * (user must redo every item). Non-empty = partial rejection; the user
   * UI locks every other item.
   *
   * Always an array (never null) so clients can branch on `.length`.
   */
  item_keys: KycItemKey[];
}

export interface OnboardingStatusResponse {
  step: OnboardingStep;
  role: 'client' | 'professional' | null;
  /**
   * Raw `users.kyc_status`. Used by the sticky "under review" banner
   * that sits on the tabbed shell while the admin queue catches up.
   * Distinct from `step`, which lumps `pending_review` and `approved`
   * together as `'complete'` once items are filled.
   */
  kyc_status: KycStatus;
  kyc_progress: KycProgress;
  kyc_rejection: KycRejection | null;
}

export type IdentityType = 'nin' | 'bvn' | 'passport' | 'drivers_license';

/**
 * Response from `GET /api/v1/onboarding/handle/check`. The endpoint returns
 * a 200 in both available and unavailable cases — branch on `available`.
 *
 * `reason` semantics (only present when `available === false`):
 *   - `taken`           — owned by another active user, or in `handle_redirects` (90-day) for someone else.
 *   - `invalid_format`  — fails the `^[a-z0-9_]{3,24}$` regex.
 *   - `reserved`        — on the reserved list.
 */
export type HandleCheckResponse =
  | { available: true; normalized: string }
  | {
      available: false;
      reason: 'taken' | 'invalid_format' | 'reserved';
      suggestions: string[];
    };

export interface ProfessionalKycPayload {
  full_name?: string;
  handle?: string;
  occupation?: string;
  description?: string;
  interests?: string[];
  identity?: {
    type: IdentityType;
    number: string;
    /** File-service key (uuid.ext) for the photo of the ID document. */
    document_upload_key?: string;
    /** @deprecated — use document_upload_key. */
    document_upload_id?: string;
  };
  /** File-service key for the user's selfie photo. */
  selfie?: { upload_key: string };
}

export interface ClientKycPayload {
  full_name?: string;
  description?: string;
  interests?: string[];
}

// ── KYC spec ─────────────────────────────────────────────────────────────────
//
// Mirrors apps/backend/src/features/onboarding/onboarding.types.ts. Keep the
// two in sync — see api-docs/onboarding-kyc-spec.md.

export type KycItemKey =
  | 'full_name'
  | 'handle'
  | 'occupation'
  | 'description'
  | 'interests'
  | 'bank_account'
  | 'identity'
  | 'selfie'
  | 'rates';

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

export type KycValidationRule =
  | { rule: 'min_length'; value: number; message?: string }
  | { rule: 'max_length'; value: number; message?: string }
  | { rule: 'min_items'; value: number; message?: string }
  | { rule: 'max_items'; value: number; message?: string }
  | { rule: 'regex'; value: string; message?: string }
  | { rule: 'numeric_only'; message?: string }
  | { rule: 'one_of'; value: string[]; message?: string }
  | { rule: 'allowed_extensions'; value: string[]; message?: string }
  | { rule: 'allowed_id_methods'; value: IdentityType[]; message?: string }
  | {
      rule: 'id_number_per_method';
      value: Record<string, { rule: 'regex'; value: string }>;
      message?: string;
    };

export interface KycItemSpec {
  key: KycItemKey;
  kind: KycItemKind;
  label: string;
  subtitle: string;
  required: boolean;
  enabled: boolean;
  validation: KycValidationRule[];
  /** Currently-saved value, shape depends on `kind`. Null when nothing is saved. */
  value: unknown | null;
  complete: boolean;
}

/**
 * Set on the spec response when the user is currently in a `kyc_rejected`
 * state with admin-flagged items. The frontend uses this to lock every
 * item NOT in `item_keys` — only the flagged ones remain editable.
 *
 * `null` means "no active rejection scope" — render the spec normally.
 * Whole-submission rejections (or users awaiting re-review after a
 * resubmit) are also surfaced as `null` since there's nothing to scope.
 */
export interface KycResubmission {
  submission_id: string;
  item_keys: KycItemKey[];
  /**
   * Subset of `item_keys` the user has already touched since the
   * rejection. Drives the Proceed gate — once every flagged key is
   * acknowledged, the user can resubmit. `bank_account` and `rates`
   * are passively acknowledged on the server (existence of data is
   * proof) and don't appear here even after the user updates them.
   */
  acknowledged_keys: KycItemKey[];
  reason_code: string;
  note: string | null;
}

export interface KycSpecResponse {
  role: 'client' | 'professional';
  items: KycItemSpec[];
  completed_count: number;
  total_required: number;
  all_complete: boolean;
  /** See `KycResubmission`. `null` when there's no rejection to scope. */
  resubmission: KycResubmission | null;
}

// Per-kind value shapes — type-narrow on `kind` to consume.

export interface KycBankValue {
  bank_code: string;
  bank_name: string;
  account_number_masked: string;
  account_name: string;
}

export interface KycIdentityValue {
  method: IdentityType;
  id_number_masked: string;
  document_upload_key: string | null;
}

export interface KycSelfieValue {
  upload_key: string;
}

export interface KycRateValue {
  id: string;
  call_type: 'audio' | 'video';
  duration_minutes: number;
  price_kobo: number;
}
