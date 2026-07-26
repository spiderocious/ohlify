import type { IntentRequirement, IntentStatus, IntentView } from '@ohlify/core';

export type { IntentRequirement, IntentStatus, IntentView };

export function intentViewFromJson(json: Record<string, unknown>): IntentView {
  return {
    ref: json.ref as string,
    status: json.status as IntentStatus,
    requirement: json.requirement as IntentRequirement,
    current_value: typeof json.current_value === 'number' ? json.current_value : 0,
    shortfall: typeof json.shortfall === 'number' ? json.shortfall : 0,
    expires_at: json.expires_at as string,
    created_at: json.created_at as string,
  };
}
