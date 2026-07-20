import type { Role } from '@ohlify/core';
import { apiClient } from '@shared/api/api-client';

import { completeKycResultFromJson, type CompleteKycResult } from '../types/complete-kyc-result';
import { handleCheckResultFromJson, type HandleCheckResult } from '../types/handle-check-result';
import { kycProgressFromJson, onboardingStatusFromJson, type KycProgress, type OnboardingStatus } from '../types/onboarding-status';
import { kycSpecResponseFromJson, type KycSpecResponse } from '../types/kyc-spec';
import { roleResultFromJson, type RoleResult } from '../types/role-result';

/**
 * Pure HTTP layer for /onboarding/*. Mirrors
 * mobile/lib/features/onboarding/onboarding_api.dart in full.
 */
export const onboardingApi = {
  getStatus(): Promise<OnboardingStatus> {
    return apiClient.get('onboarding/status', {
      fromJson: (data) => onboardingStatusFromJson(data as Record<string, unknown>),
    });
  },

  getKycSpec(): Promise<KycSpecResponse> {
    return apiClient.get('onboarding/kyc/spec', {
      fromJson: (data) => kycSpecResponseFromJson(data as Record<string, unknown>),
    });
  },

  setRole(role: Role): Promise<RoleResult> {
    return apiClient.post(
      'onboarding/role',
      { role },
      { fromJson: (data) => roleResultFromJson(data as Record<string, unknown>) },
    );
  },

  saveClientKyc(params: { fullName?: string; description?: string; interests?: string[] }): Promise<KycProgress> {
    const body: Record<string, unknown> = {};
    if (params.fullName !== undefined) body.full_name = params.fullName;
    if (params.description !== undefined) body.description = params.description;
    if (params.interests !== undefined) body.interests = params.interests;
    return apiClient.patch('onboarding/kyc/client', body, {
      fromJson: (data) =>
        kycProgressFromJson(((data as Record<string, unknown>).kyc_progress as Record<string, unknown>) ?? {}),
    });
  },

  saveProfessionalKyc(body: Record<string, unknown>): Promise<KycProgress> {
    return apiClient.patch('onboarding/kyc/professional', body, {
      fromJson: (data) =>
        kycProgressFromJson(((data as Record<string, unknown>).kyc_progress as Record<string, unknown>) ?? {}),
    });
  },

  checkHandle(handle: string): Promise<HandleCheckResult> {
    return apiClient.get('onboarding/handle/check', {
      queryParams: { handle },
      fromJson: (data) => handleCheckResultFromJson(data as Record<string, unknown>),
    });
  },

  completeKyc(): Promise<CompleteKycResult> {
    return apiClient.post('onboarding/kyc/complete', {}, {
      fromJson: (data) => completeKycResultFromJson(data as Record<string, unknown>),
    });
  },
};
