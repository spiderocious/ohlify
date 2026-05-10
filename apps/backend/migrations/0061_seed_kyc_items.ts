import type { MigrationBuilder } from 'node-pg-migrate';

// Seeds the two platform_config keys that drive the onboarding KYC screen:
//
//   kyc.professional_items — array of KycItemSpec for the professional flow
//   kyc.client_items       — array of KycItemSpec for the client flow
//
// Both are public (consumed by the unauth-but-token-protected
// GET /onboarding/kyc/spec endpoint, exposed structurally via
// GET /platform-config/public for parity).
//
// Selfie is enabled=true here because the new spec endpoint declares it as a
// required step. If you want to roll out gradually, flip enabled=false in
// admin and the frontend will hide it.
//
// Identity gains a `document_upload_key` field so the frontend collects a
// photo of the ID alongside the number. The backend validates the key shape
// (UUID + extension) via zod.
//
// Shape mirrors api-docs/onboarding-kyc-spec.md exactly — keep them in sync.

const PROFESSIONAL_ITEMS = [
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
      {
        rule: 'allowed_id_methods',
        value: ['nin', 'bvn', 'passport', 'drivers_license'],
      },
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

const CLIENT_ITEMS = [
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

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    INSERT INTO platform_config (key, value, is_public) VALUES
      ('kyc.professional_items', $$${JSON.stringify(PROFESSIONAL_ITEMS)}$$::jsonb, TRUE),
      ('kyc.client_items',       $$${JSON.stringify(CLIENT_ITEMS)}$$::jsonb,       TRUE)
    ON CONFLICT (key) DO NOTHING
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DELETE FROM platform_config WHERE key IN ('kyc.professional_items','kyc.client_items')`);
};
