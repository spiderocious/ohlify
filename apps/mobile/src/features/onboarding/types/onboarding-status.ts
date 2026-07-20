import type { Role } from '@ohlify/core';

/** Mirrors mobile/lib/features/onboarding/types/onboarding_status.dart. */
export type OnboardingStepStatus =
  | 'roleSelection'
  | 'clientKyc'
  | 'professionalKyc'
  | 'kycRejected'
  | 'complete';

export function onboardingStepStatusFromWire(value: string | undefined): OnboardingStepStatus {
  switch (value) {
    case 'client_kyc':
      return 'clientKyc';
    case 'professional_kyc':
      return 'professionalKyc';
    case 'kyc_rejected':
      return 'kycRejected';
    case 'complete':
      return 'complete';
    case 'role_selection':
    default:
      return 'roleSelection';
  }
}

/**
 * Raw `users.kyc_status` mirrored by GET /onboarding/status. Used to drive
 * the sticky "under review" banner — distinct from the step-machine which
 * collapses pending/approved into 'complete'.
 */
export type KycLifecycleStatus = 'none' | 'pendingReview' | 'approved' | 'rejected';

export function kycLifecycleStatusFromWire(value: string | undefined): KycLifecycleStatus {
  switch (value) {
    case 'pending_review':
      return 'pendingReview';
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    case 'none':
    default:
      return 'none';
  }
}

export interface KycProgress {
  completedItems: string[];
  totalItems: number;
  percent: number;
}

export function kycProgressFromJson(json: Record<string, unknown> | undefined): KycProgress {
  return {
    completedItems: ((json?.completed_items as unknown[]) ?? []).map(String),
    totalItems: (json?.total_items as number) ?? 0,
    percent: (json?.percent as number) ?? 0,
  };
}

/**
 * Status of the user's MOST RECENT kyc_submissions row — distinct from
 * users.kyc_status. After resubmit, this flips to 'pendingReview' while the
 * parent step stays 'kycRejected' until admin re-reviews.
 */
export type LatestSubmissionStatus = 'rejected' | 'pendingReview';

function latestSubmissionStatusFromWire(value: string | undefined): LatestSubmissionStatus | undefined {
  if (value === 'rejected') return 'rejected';
  if (value === 'pending_review') return 'pendingReview';
  return undefined;
}

/**
 * Populated when step === 'kycRejected'. Drives the rejection screen UI.
 * Mirrors the backend KycRejection shape from
 * docs/onboarding-kyc-rejection-handoff-mobile.md.
 */
export interface KycRejection {
  /** Stable code: document_unclear | identity_mismatch | expired_document | fraudulent | other. */
  reasonCode: string;
  /** Free-text admin note — may be absent on legacy rejection rows. */
  note?: string;
  reviewedAt: string;
  submissionId: string;
  latestSubmissionStatus: LatestSubmissionStatus;
  /** Per-item resubmission set. Empty = whole-submission rejection (legacy). Non-empty = partial rejection. */
  itemKeys: string[];
}

const REASON_LABELS: Record<string, string> = {
  document_unclear: 'The ID document was unclear',
  identity_mismatch: 'Identity details did not match',
  expired_document: 'The ID document was expired',
  fraudulent: 'Verification failed integrity checks',
  other: 'Additional information needed',
};

export function kycRejectionReasonLabel(rejection: KycRejection): string {
  return REASON_LABELS[rejection.reasonCode] ?? rejection.reasonCode.replace(/_/g, ' ');
}

export function kycRejectionFromJson(json: Record<string, unknown>): KycRejection {
  return {
    reasonCode: (json.reason_code as string) ?? 'other',
    note: json.note as string | undefined,
    reviewedAt: (json.reviewed_at as string) ?? new Date().toISOString(),
    submissionId: (json.submission_id as string) ?? '',
    latestSubmissionStatus:
      latestSubmissionStatusFromWire(json.latest_submission_status as string | undefined) ??
      'rejected',
    itemKeys: ((json.item_keys as unknown[]) ?? []).map(String),
  };
}

export interface OnboardingStatus {
  step: OnboardingStepStatus;
  role?: Role;
  /** Drives the sticky "under review" banner — don't conflate with `step`. */
  kycStatus: KycLifecycleStatus;
  progress: KycProgress;
  /** Present only when step === 'kycRejected'. */
  kycRejection?: KycRejection;
}

export function onboardingStatusFromJson(json: Record<string, unknown>): OnboardingStatus {
  const role = json.role as string | undefined;
  const rejection = json.kyc_rejection;
  return {
    step: onboardingStepStatusFromWire(json.step as string | undefined),
    role: role === 'professional' ? 'professional' : role === 'client' ? 'client' : undefined,
    kycStatus: kycLifecycleStatusFromWire(json.kyc_status as string | undefined),
    progress: kycProgressFromJson(json.kyc_progress as Record<string, unknown> | undefined),
    kycRejection:
      rejection && typeof rejection === 'object'
        ? kycRejectionFromJson(rejection as Record<string, unknown>)
        : undefined,
  };
}
