import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * The kill switch for the native call engine.
 *
 * Mobile now has two media paths — `agora_rtc_engine` driven directly, and the
 * legacy `call-app` WebView — behind one `CallEngine` interface. This row picks
 * which one runs.
 *
 * Seeded **true**: native Agora is the call path. The client no longer reads
 * this — `CallSessionScreen` starts the native engine unconditionally — but
 * the row is kept so an operator flipping it does not hit a missing key, and
 * so the WebView engine (still wired, still present) can be brought back with
 * a one-line change rather than a re-plumb.
 *
 * Public because the client used to read it before a call started.
 */
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    INSERT INTO platform_config (key, value, is_public)
    VALUES ('calls.native_engine_enabled', 'true'::jsonb, TRUE)
    ON CONFLICT (key) DO NOTHING
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DELETE FROM platform_config WHERE key = 'calls.native_engine_enabled'`);
};
