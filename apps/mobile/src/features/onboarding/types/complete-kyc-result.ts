import { onboardingStepStatusFromWire, type OnboardingStepStatus } from './onboarding-status';

/** Mirrors CompleteKycResult in mobile/lib/features/onboarding/onboarding_api.dart. */
export interface CompleteKycResult {
  /** 'approved' | 'pending_review' */
  kycStatus: string;
  nextStep: OnboardingStepStatus;
}

export function completeKycResultFromJson(json: Record<string, unknown>): CompleteKycResult {
  return {
    kycStatus: (json.kyc_status as string) ?? 'pending_review',
    nextStep: onboardingStepStatusFromWire(json.next_step as string | undefined),
  };
}
