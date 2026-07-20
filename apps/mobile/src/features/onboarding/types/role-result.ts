import type { Role } from '@ohlify/core';

import { onboardingStepStatusFromWire, type OnboardingStepStatus } from './onboarding-status';

/** Mirrors the RoleResult/RoleResultTokens classes in mobile/lib/features/onboarding/onboarding_api.dart. */
export interface RoleResultTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

function roleResultTokensFromJson(json: Record<string, unknown>): RoleResultTokens {
  return {
    accessToken: (json.access_token as string) ?? '',
    refreshToken: (json.refresh_token as string) ?? '',
    expiresIn: (json.expires_in as number) ?? 0,
  };
}

export interface RoleResult {
  role: Role;
  nextStep: OnboardingStepStatus;
  /**
   * Re-minted token pair. Present only when the role actually changed
   * (no-op same-role calls omit it). Callers MUST persist these via
   * tokenService.setTokens before the next request — the role is baked into
   * the access-token payload and the old token will 401 on every
   * requireRole-gated endpoint.
   */
  tokens?: RoleResultTokens;
}

export function roleResultFromJson(json: Record<string, unknown>): RoleResult {
  const tokensJson = json.tokens;
  return {
    role: json.role === 'professional' ? 'professional' : 'client',
    nextStep: onboardingStepStatusFromWire(json.next_step as string | undefined),
    tokens:
      tokensJson && typeof tokensJson === 'object'
        ? roleResultTokensFromJson(tokensJson as Record<string, unknown>)
        : undefined,
  };
}
