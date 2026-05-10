import type { KycItemConfig } from '@features/onboarding/onboarding.types.js';

// Compiled-in defaults for the KYC item spec. These mirror migration
// 0061_seed_kyc_items.ts exactly — keep them in sync. They are used:
//   1. Until the first DB load lands at boot (snapshot starts here).
//   2. As a fallback when a row is missing or the value isn't a valid array.
// The seeded migration sets these as the canonical persisted values; admins
// can edit the rows from /admin/config without touching this file.

export const DEFAULT_PROFESSIONAL_KYC_ITEMS: KycItemConfig[] = [
  {
    key: 'full_name',
    kind: 'text',
    label: 'Full name',
    subtitle: 'Enter your full legal name as it appears on your ID.',
    required: true,
    enabled: true,
    validation: [
      { rule: 'min_length', value: 2 },
      { rule: 'max_length', value: 80 },
    ],
  },
  {
    key: 'handle',
    kind: 'handle',
    label: 'Username',
    subtitle: 'A unique handle others can find you by (e.g. feranmi).',
    required: true,
    enabled: true,
    validation: [
      {
        rule: 'regex',
        value: '^[a-z0-9_]{3,20}$',
        message: '3–20 chars, lowercase letters, digits, or underscore.',
      },
    ],
  },
  {
    key: 'occupation',
    kind: 'text',
    label: 'Occupation',
    subtitle: 'Let clients know what you do so you are easy to find.',
    required: true,
    enabled: true,
    validation: [{ rule: 'max_length', value: 60 }],
  },
  {
    key: 'description',
    kind: 'textarea',
    label: 'About you',
    subtitle: 'A short intro about who you are and how you help.',
    required: true,
    enabled: true,
    validation: [{ rule: 'max_length', value: 280 }],
  },
  {
    key: 'interests',
    kind: 'tags',
    label: 'Interests',
    subtitle: 'Pick topics so we can recommend you to the right clients.',
    required: true,
    enabled: true,
    validation: [
      { rule: 'min_items', value: 1 },
      { rule: 'max_items', value: 8 },
    ],
  },
  {
    key: 'bank_account',
    kind: 'bank',
    label: 'Bank account',
    subtitle: 'Where we send your payouts.',
    required: true,
    enabled: true,
    validation: [],
  },
  {
    key: 'identity',
    kind: 'identity',
    label: 'Identity verification',
    subtitle: 'Verify your identity to keep the community safe.',
    required: true,
    enabled: true,
    validation: [
      { rule: 'allowed_id_methods', value: ['nin', 'bvn', 'passport', 'drivers_license'] },
      {
        rule: 'id_number_per_method',
        value: {
          nin: { rule: 'regex', value: '^[0-9]{11}$' },
          bvn: { rule: 'regex', value: '^[0-9]{11}$' },
          passport: { rule: 'regex', value: '^[A-Z0-9]{8,10}$' },
          drivers_license: { rule: 'regex', value: '^[A-Z0-9]{8,12}$' },
        },
      },
    ],
  },
  {
    key: 'selfie',
    kind: 'selfie',
    label: 'Selfie',
    subtitle: 'Take a clear photo of your face. We compare it with your ID.',
    required: true,
    enabled: true,
    validation: [{ rule: 'allowed_extensions', value: ['jpg', 'jpeg', 'png'] }],
  },
  {
    key: 'rates',
    kind: 'rates',
    label: 'Rates',
    subtitle: 'Set what you charge per call type and duration.',
    required: true,
    enabled: true,
    validation: [{ rule: 'min_items', value: 1 }],
  },
];

export const DEFAULT_CLIENT_KYC_ITEMS: KycItemConfig[] = [
  {
    key: 'full_name',
    kind: 'text',
    label: 'Full name',
    subtitle: 'Enter your full legal name.',
    required: true,
    enabled: true,
    validation: [
      { rule: 'min_length', value: 2 },
      { rule: 'max_length', value: 80 },
    ],
  },
  {
    key: 'interests',
    kind: 'tags',
    label: 'Interests',
    subtitle: 'Pick topics so we can recommend the right professionals.',
    required: true,
    enabled: true,
    validation: [
      { rule: 'min_items', value: 1 },
      { rule: 'max_items', value: 8 },
    ],
  },
];

/**
 * Loose runtime guard for a `KycItemConfig` array coming out of the DB. We
 * accept anything that has the required keys with the right primitive types;
 * unknown extra fields are passed through (admins might add new metadata).
 * Falls back to defaults when malformed.
 */
export const parseKycItems = (raw: unknown, fallback: KycItemConfig[]): KycItemConfig[] => {
  if (!Array.isArray(raw)) return fallback;
  const result: KycItemConfig[] = [];
  for (const entry of raw) {
    if (entry === null || typeof entry !== 'object') return fallback;
    const e = entry as Record<string, unknown>;
    if (
      typeof e['key'] !== 'string' ||
      typeof e['kind'] !== 'string' ||
      typeof e['label'] !== 'string' ||
      typeof e['subtitle'] !== 'string' ||
      typeof e['required'] !== 'boolean' ||
      typeof e['enabled'] !== 'boolean' ||
      !Array.isArray(e['validation'])
    ) {
      return fallback;
    }
    result.push(entry as unknown as KycItemConfig);
  }
  return result;
};
