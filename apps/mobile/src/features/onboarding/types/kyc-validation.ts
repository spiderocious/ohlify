/**
 * Mirrors mobile/lib/features/onboarding/types/kyc_validation.dart — a
 * discriminated union from packages/api/src/onboarding/types.ts. Each
 * variant carries only the fields it needs; screens narrow on `rule`.
 */
export type KycValidationRule =
  | { rule: 'min_length'; value: number; message?: string }
  | { rule: 'max_length'; value: number; message?: string }
  | { rule: 'min_items'; value: number; message?: string }
  | { rule: 'max_items'; value: number; message?: string }
  | { rule: 'regex'; value: string; message?: string }
  | { rule: 'numeric_only'; message?: string }
  | { rule: 'one_of'; value: string[]; message?: string }
  | { rule: 'allowed_extensions'; value: string[]; message?: string }
  | { rule: 'allowed_id_methods'; value: string[]; message?: string }
  | { rule: 'id_number_per_method'; value: Record<string, string>; message?: string };

export function kycValidationRuleFromJson(json: Record<string, unknown>): KycValidationRule | null {
  const rule = json.rule as string | undefined;
  const message = json.message as string | undefined;
  switch (rule) {
    case 'min_length':
      return { rule: 'min_length', value: json.value as number, message };
    case 'max_length':
      return { rule: 'max_length', value: json.value as number, message };
    case 'min_items':
      return { rule: 'min_items', value: json.value as number, message };
    case 'max_items':
      return { rule: 'max_items', value: json.value as number, message };
    case 'regex':
      return { rule: 'regex', value: json.value as string, message };
    case 'numeric_only':
      return { rule: 'numeric_only', message };
    case 'one_of':
      return { rule: 'one_of', value: (json.value as unknown[]).map(String), message };
    case 'allowed_extensions':
      return { rule: 'allowed_extensions', value: (json.value as unknown[]).map(String), message };
    case 'allowed_id_methods':
      return { rule: 'allowed_id_methods', value: (json.value as unknown[]).map(String), message };
    case 'id_number_per_method': {
      const raw = json.value as Record<string, Record<string, unknown>>;
      const value: Record<string, string> = {};
      for (const [key, v] of Object.entries(raw)) {
        value[key] = v.value as string;
      }
      return { rule: 'id_number_per_method', value, message };
    }
    default:
      // Unknown rule — drop it so the UI doesn't crash on backend additions.
      return null;
  }
}

export function findRule<T extends KycValidationRule['rule']>(
  rules: KycValidationRule[],
  ruleName: T,
): Extract<KycValidationRule, { rule: T }> | undefined {
  return rules.find((r) => r.rule === ruleName) as Extract<KycValidationRule, { rule: T }> | undefined;
}
