import type { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE users (
      id                  TEXT PRIMARY KEY,
      role                user_role NOT NULL DEFAULT 'client',
      status              user_status NOT NULL DEFAULT 'active',
      email               CITEXT UNIQUE NOT NULL,
      email_verified_at   TIMESTAMPTZ,
      phone_number        TEXT UNIQUE NOT NULL,
      phone_verified_at   TIMESTAMPTZ,
      password_hash       TEXT NOT NULL,
      full_name           TEXT,
      handle              CITEXT UNIQUE,
      handle_changed_at   TIMESTAMPTZ,
      avatar_url          TEXT,
      cover_photo_url     TEXT,
      occupation          TEXT,
      description         TEXT,
      interests           TEXT[] NOT NULL DEFAULT '{}',
      categories          TEXT[] NOT NULL DEFAULT '{}',
      is_available        BOOLEAN NOT NULL DEFAULT TRUE,
      kyc_status          kyc_status NOT NULL DEFAULT 'none',
      kyc_submitted_at    TIMESTAMPTZ,
      kyc_reviewed_at     TIMESTAMPTZ,
      kyc_reject_reason   TEXT,
      last_seen_at        TIMESTAMPTZ,
      suspended_until     TIMESTAMPTZ,
      deleted_at          TIMESTAMPTZ,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`CREATE INDEX users_role_status_idx ON users (role, status) WHERE deleted_at IS NULL`);
  pgm.sql(`CREATE INDEX users_handle_idx ON users (handle) WHERE deleted_at IS NULL AND handle IS NOT NULL`);
  pgm.sql(`CREATE INDEX users_is_available_idx ON users (is_available) WHERE role = 'professional' AND deleted_at IS NULL`);
  pgm.sql(`
    CREATE INDEX users_fts_idx ON users
      USING GIN (to_tsvector('simple', coalesce(full_name,'') || ' ' || coalesce(occupation,'')))
    WHERE role = 'professional' AND deleted_at IS NULL
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql('DROP TABLE IF EXISTS users');
};
