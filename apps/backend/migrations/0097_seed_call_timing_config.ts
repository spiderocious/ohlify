import type { MigrationBuilder } from 'node-pg-migrate';

// Call-timing windows the mobile clients need in order to render honest
// countdowns.
//
// These three numbers already existed — as constants compiled into the Flutter
// binary (`_noAnswerFallback`, `_fallbackRing`, `_pausedIdleLimitFallback`) and
// as server-side behaviour. That is the drift risk `instant-calls.md` §5 calls
// out: if the server window changes, a shipped binary cannot follow it, and the
// user watches a countdown that disagrees with what the server is about to do.
//
// All three are public: they describe policy the client must render, and none
// of them leaks anything a caller could not measure with a stopwatch. The
// clients keep their compiled fallbacks, so a config fetch that fails behaves
// exactly as before.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    INSERT INTO platform_config (key, value, is_public) VALUES
      -- How long an outgoing call rings before it counts as unanswered.
      ('calls.no_answer_seconds',         '45',   TRUE),

      -- Ring window used when a push arrives without ring_expires_at to
      -- derive one from. Same server window, different consumer.
      ('calls.fallback_ring_seconds',     '45',   TRUE),

      -- How long a call may sit paused (caller out of minutes) before the
      -- server ends it. The on-screen countdown must not outlast this.
      ('calls.paused_idle_limit_seconds', '90',   TRUE)
    ON CONFLICT (key) DO NOTHING
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    DELETE FROM platform_config WHERE key IN (
      'calls.no_answer_seconds',
      'calls.fallback_ring_seconds',
      'calls.paused_idle_limit_seconds'
    )
  `);
};
