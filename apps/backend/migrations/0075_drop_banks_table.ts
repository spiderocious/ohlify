import type { MigrationBuilder } from 'node-pg-migrate';

// Banks are now sourced live from Paystack `/bank` with a 24h Redis cache
// (see lib/paystack/list-banks-cached.ts), so the `banks` table is no longer
// the source of truth. `bank_accounts.bank_code` stays as a free-text string
// column — validation happens against the cached Paystack list at write time.
//
// The FK from `bank_accounts.bank_code -> banks(code)` is auto-named by
// node-pg-migrate as `bank_accounts_bank_code_fkey`; drop it before the table.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`ALTER TABLE bank_accounts DROP CONSTRAINT IF EXISTS bank_accounts_bank_code_fkey`);
  pgm.sql(`DROP TABLE IF EXISTS banks`);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE banks (
      code       TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      logo_url   TEXT,
      is_active  BOOLEAN NOT NULL DEFAULT TRUE,
      synced_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  // Note: intentionally NOT restoring the FK on bank_accounts.bank_code — the
  // new design treats bank_code as free text validated against Paystack, so
  // rolling back the drop should leave the column FK-free.
};
