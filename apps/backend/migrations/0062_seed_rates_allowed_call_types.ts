import type { MigrationBuilder } from 'node-pg-migrate';

// Seeds `rates.allowed_call_types` so admins can disable a call kind
// (e.g. drop video while infra catches up) without a code deploy.
//
// `is_public = TRUE` because the customer-web AddRateForm reads it via
// /platform-config/public to populate the call-type dropdown.
//
// Default mirrors the historical hardcoded set; behaviour is unchanged on
// rollout.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    INSERT INTO platform_config (key, value, is_public) VALUES
      ('rates.allowed_call_types', '["audio","video"]'::jsonb, TRUE)
    ON CONFLICT (key) DO NOTHING
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DELETE FROM platform_config WHERE key = 'rates.allowed_call_types'`);
};
