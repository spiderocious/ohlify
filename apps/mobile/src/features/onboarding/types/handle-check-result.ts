/** Mirrors HandleCheckResult in mobile/lib/features/onboarding/onboarding_api.dart. */
export interface HandleCheckResult {
  available: boolean;
  normalized?: string;
  /** 'taken' | 'invalid_format' | 'reserved' */
  reason?: string;
  suggestions: string[];
}

export function handleCheckResultFromJson(json: Record<string, unknown>): HandleCheckResult {
  return {
    available: (json.available as boolean) ?? false,
    normalized: json.normalized as string | undefined,
    reason: json.reason as string | undefined,
    suggestions: ((json.suggestions as unknown[]) ?? []).map(String),
  };
}
