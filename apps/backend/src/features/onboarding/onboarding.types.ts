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
  /**
   * Per-item resubmission set. Empty array = whole-submission rejection
   * (user must redo every item — current behavior). Non-empty = partial
   * rejection; the user-facing KYC screen locks every other item.
   *
   * Always an array (never null) so clients can branch on `.length`.
   */
  item_keys: KycItemKey[];
}

export interface OnboardingStatus {
  step: OnboardingStep;
  role: UserRole | null;
  /**
   * Mirrors `users.kyc_status` so clients can render UI that depends on
   * the raw status without a second request. Notably the sticky "KYC
   * under review" banner that persists across the tabbed shell while
   * the admin queue catches up.
   */
  kyc_status: KycStatus;
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
  /** Per-item resubmission set; null/empty = whole-submission rejection. */
  reject_item_keys: string[] | null;
  /**
   * Subset of `reject_item_keys` the user has actually patched since
   * the rejection. `kyc/complete` requires this to cover the full set
   * before letting the resubmit through.
   */
  reject_acknowledged_keys: string[] | null;
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
  // The client-side photo. Deliberately NOT `selfie`: that one lives on
  // kyc_submissions and only means something next to an ID document, which
  // clients never submit. This one is a standalone column on `users`.
  'client_selfie',
  /**
   * @deprecated Superseded by `audio_rate` + `video_rate` (migration 0098).
   * Kept in the known-key set on purpose: `sanitizeItemKeys` filters historical
   * `kyc_submissions.reject_item_keys` against this list, so dropping it would
   * silently discard the key from old partial-rejection rows and widen those
   * users' resubmit scope. Do not remove until no submission row references it.
   */
  'rates',
  // One active rate per channel is already the data model
  // (`rates.single_rate_per_channel`), so each channel gets its own KYC item
  // instead of one item wrapping a list. Lets the client render — and the user
  // fill — audio and video independently.
  'audio_rate',
  'video_rate',
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
  /** @deprecated Superseded by `call_rate`. See the `rates` key above. */
  | 'rates'
  // Single-channel rate editor: duration + price for one fixed call_type.
  // Both `audio_rate` and `video_rate` render with this kind — the key names
  // the channel, the kind names the widget.
  | 'call_rate'
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

/**
 * Per-item lifecycle, as the user reads it.
 *
 * Derived server-side rather than left to each client. The same four states
 * were previously inferred from three separate fields — `complete`,
 * `resubmission.item_keys` and the top-level `kyc_status` — which is three
 * sources of truth for one badge and two clients free to combine them
 * differently. One derivation here means mobile and web can never disagree.
 *
 * Maps 1:1 onto the design system's KYC status vocabulary (`72-status-kyc`).
 */
export type KycItemStatus = 'not_started' | 'under_review' | 'verified' | 'action_needed';

/** Per-request response shape — config + per-user value + complete flag. */
export interface KycItemSpec extends KycItemConfig {
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  value: unknown | null;
  complete: boolean;
  /**
   * What the item's badge should read. See {@link KycItemStatus}.
   *
   * Additive: `complete` stays exactly as it was, so clients that predate this
   * field keep working. Never derive completeness from this — an item can be
   * `under_review` while incomplete.
   */
  status: KycItemStatus;
  /**
   * True when the item cannot be edited right now.
   *
   * Two causes today: the submission is awaiting admin review (everything
   * locks), or a partial rejection is in force and this item was not one of
   * the flagged ones. Both are policy, not validation — a locked item is not
   * an error, it is simply not this user's move.
   */
  locked: boolean;
  /**
   * Why it is locked, in words the user can read. `null` when not locked.
   *
   * Required alongside `locked`: the design system's locked tile shows a
   * reason ("Complete the steps above first"), and a lock the product cannot
   * explain reads as a bug.
   */
  lock_reason: string | null;
}

/**
 * Set when the latest submission was rejected and admin scoped the
 * rejection to specific items. The frontend uses this to lock every item
 * NOT in `item_keys` so the user only re-uploads what was flagged.
 *
 * `null` here means "no active rejection in progress" — render the spec
 * normally. Empty `item_keys` (admin rejected the whole submission, or
 * the user is currently in `pending_review` after resubmitting) is
 * surfaced as `null` too: there's nothing to scope writes to in that
 * case, so all items remain editable.
 */
export interface KycResubmission {
  submission_id: string;
  item_keys: KycItemKey[];
  /**
   * Subset of `item_keys` the user has already touched since the
   * rejection. Drives client-side gating: Proceed is disabled until
   * every flagged key (or its passive counterpart — `bank_account`,
   * `rates`) is in this set.
   */
  acknowledged_keys: KycItemKey[];
  reason_code: string;
  note: string | null;
}

export interface KycSpecResponse {
  role: UserRole;
  items: KycItemSpec[];
  completed_count: number;
  total_required: number;
  all_complete: boolean;
  /** See `KycResubmission`. `null` when there's no rejection to scope. */
  resubmission: KycResubmission | null;
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
  'audio_rate',
  'video_rate',
] as const;
export type ProfessionalKycItem = (typeof PROFESSIONAL_KYC_ITEMS)[number];
