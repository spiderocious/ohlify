import type { MigrationBuilder } from 'node-pg-migrate';

// Calls revamp — extend `journal_kind` for the minutes economy.
//
// The revamp added two money flows — buying minutes (escrow debit) and
// settling a call (escrow → payee + platform fee) — whose journals post with
// `kind: 'minutes_purchase'` and `kind: 'minutes_settlement'`
// (lib/wallet/flows/minutes.ts, minutes-settle.ts). The PostJournalInput TS
// type already lists both, but no migration ever extended the DB enum, so
// every buy and every settle threw `invalid input value for enum journal_kind`
// (22P02) and 500'd — the whole minutes economy was dead on arrival.
//
// See docs/qa-handoff/reports/minutes.bugs.md (BUG-minutes-01) and
// instant-calls.bugs.md (BUG-instant-calls-01).
//
// `ALTER TYPE ... ADD VALUE IF NOT EXISTS` is idempotent and mirrors the
// existing pattern in 0051_unify_strikes.ts.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`ALTER TYPE journal_kind ADD VALUE IF NOT EXISTS 'minutes_purchase'`);
  pgm.sql(`ALTER TYPE journal_kind ADD VALUE IF NOT EXISTS 'minutes_settlement'`);
};

// Postgres cannot DROP a value from an enum. The forward migration is
// idempotent and additive; there is nothing to reverse.
export const down = (): void => {
  // no-op — enum values cannot be removed in Postgres.
};
