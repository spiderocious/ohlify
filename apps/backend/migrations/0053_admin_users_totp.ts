import type { MigrationBuilder } from 'node-pg-migrate';

// Extend admin_users (migration 0008) with TOTP + identity fields needed by
// the admin auth slice.
//
// 0008 had `totp_secret` as plain TEXT NOT NULL. We rename to
// `totp_secret_encrypted` (still TEXT — the encrypted value is base64) and
// drop the NOT NULL because admins start with TOTP disabled and run a
// /totp/setup → /totp/confirm flow to enable it. `totp_enabled` flips on
// after confirm.
//
// Other adds:
//   - role: single-role per admin ('admin' | 'support' | 'finance_ops')
//     The 0008 `roles TEXT[]` is left in place but unused; we'll drop it
//     in a later cleanup once the admin web UI ships.
//   - full_name + last_login_at for display + audit
//   - updated_at for tracking modifications
export const up = (pgm: MigrationBuilder): void => {
  // Drop NOT NULL on totp_secret + rename for clarity.
  pgm.sql(`ALTER TABLE admin_users ALTER COLUMN totp_secret DROP NOT NULL`);
  pgm.sql(`ALTER TABLE admin_users RENAME COLUMN totp_secret TO totp_secret_encrypted`);

  pgm.sql(`
    ALTER TABLE admin_users
      ADD COLUMN totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN role TEXT NOT NULL DEFAULT 'admin'
        CHECK (role IN ('admin', 'support', 'finance_ops')),
      ADD COLUMN full_name TEXT,
      ADD COLUMN last_login_at TIMESTAMPTZ,
      ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  `);

  // Index for role-based filtering in the admin user list (admin UI may want
  // "show me all support admins").
  pgm.sql(`CREATE INDEX admin_users_role_idx ON admin_users (role)`);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP INDEX IF EXISTS admin_users_role_idx`);
  pgm.sql(`
    ALTER TABLE admin_users
      DROP COLUMN IF EXISTS updated_at,
      DROP COLUMN IF EXISTS last_login_at,
      DROP COLUMN IF EXISTS full_name,
      DROP COLUMN IF EXISTS role,
      DROP COLUMN IF EXISTS totp_enabled
  `);
  pgm.sql(`ALTER TABLE admin_users RENAME COLUMN totp_secret_encrypted TO totp_secret`);
  // Don't restore NOT NULL — would break in-flight rows that don't have a value.
};
