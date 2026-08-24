import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * One row per authentication attempt, successful or not.
 *
 * `auth_sessions` records sessions, which means it only ever sees successes: a
 * rejected password creates no session and lands nowhere. So "how many logins
 * failed last night?" — the first question anyone asks during a credential
 * stuffing attempt — was unanswerable.
 *
 * This is deliberately an append-only *log* rather than a counter table. A
 * count tells you a number; the log tells you which addresses, which reason
 * codes and which app versions, which is what turns "386 failures" into an
 * actionable finding. It is also the substrate lockout and abuse detection
 * would need, so building it as a counter would only mean building it twice.
 *
 * **`subject` is an identifier, not a credential.** It holds whatever the
 * attempt was made against — a user id once resolved, otherwise the submitted
 * email or phone. Never a password, and never a token.
 */
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE auth_events (
      id           TEXT PRIMARY KEY,
      event        TEXT NOT NULL CHECK (event IN (
                     'login', 'register', 'otp_verify',
                     'password_reset', 'refresh', 'logout'
                   )),
      outcome      TEXT NOT NULL CHECK (outcome IN ('success', 'failure')),
      -- The ErrorCode the attempt was rejected with. NULL on success.
      reason       TEXT,
      -- Set once the attempt resolves to a known account.
      user_id      TEXT REFERENCES users(id) ON DELETE SET NULL,
      -- What was attempted against: user id, email or phone. Never a secret.
      subject      TEXT,
      ip           INET,
      user_agent   TEXT,
      -- Same structured client telemetry auth_sessions already carries, so a
      -- failure can be traced to a build without parsing a user-agent string.
      platform     TEXT CHECK (platform IN ('ios','android','web')),
      app_version  TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      -- A failure with no reason is a row that cannot be acted on.
      CHECK (outcome = 'success' OR reason IS NOT NULL)
    )
  `);

  // The dashboard's own query: outcomes bucketed over a window.
  pgm.sql(`CREATE INDEX auth_events_created_idx ON auth_events (created_at DESC)`);

  // "Which addresses are failing repeatedly?" — partial, because the success
  // rows vastly outnumber the failures and are never scanned this way.
  pgm.sql(`
    CREATE INDEX auth_events_failure_ip_idx
      ON auth_events (ip, created_at DESC)
      WHERE outcome = 'failure'
  `);

  // Per-account history, for support answering "was that them?".
  pgm.sql(`
    CREATE INDEX auth_events_user_idx
      ON auth_events (user_id, created_at DESC)
      WHERE user_id IS NOT NULL
  `);

  // Append-only, matching the discipline the wallet ledger and call_events
  // already hold: an audit trail that can be edited is not an audit trail.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION auth_events_reject_mutation() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'auth_events is append-only: % is forbidden', TG_OP;
    END;
    $$ LANGUAGE plpgsql
  `);
  pgm.sql(`
    CREATE TRIGGER auth_events_append_only
      BEFORE UPDATE OR DELETE ON auth_events
      FOR EACH ROW EXECUTE FUNCTION auth_events_reject_mutation()
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql('DROP TRIGGER IF EXISTS auth_events_append_only ON auth_events');
  pgm.sql('DROP FUNCTION IF EXISTS auth_events_reject_mutation()');
  pgm.sql('DROP TABLE IF EXISTS auth_events');
};
