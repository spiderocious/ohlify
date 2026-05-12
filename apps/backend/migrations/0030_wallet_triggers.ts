import type { MigrationBuilder } from 'node-pg-migrate';

// Three guards on the wallet ledger:
//   1. Append-only — reject UPDATE/DELETE on wallet_entries and journal_entries.
//      Refunds/reversals are NEW rows, never amends.
//   2. Sum-to-zero — every journal's wallet_entries lines must sum to 0.
//      Implemented as a deferred constraint trigger so multi-row inserts
//      within a tx are evaluated at COMMIT, not on each line.
//   3. Balance maintenance — AFTER INSERT on wallet_entries advances
//      account_balances. Advisory-locked per account_id so concurrent inserts
//      against the same account serialize their balance updates.
export const up = (pgm: MigrationBuilder): void => {
  // ── 1. Append-only enforcement ────────────────────────────────────────────
  pgm.sql(`
    CREATE OR REPLACE FUNCTION wallet_reject_mutation() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'wallet ledger is append-only: % on % is forbidden',
        TG_OP, TG_TABLE_NAME;
    END;
    $$ LANGUAGE plpgsql
  `);

  pgm.sql(`
    CREATE TRIGGER wallet_entries_append_only
      BEFORE UPDATE OR DELETE ON wallet_entries
      FOR EACH ROW EXECUTE FUNCTION wallet_reject_mutation()
  `);

  pgm.sql(`
    CREATE TRIGGER journal_entries_append_only
      BEFORE UPDATE OR DELETE ON journal_entries
      FOR EACH ROW EXECUTE FUNCTION wallet_reject_mutation()
  `);

  // ── 2. Sum-to-zero (deferred to commit) ──────────────────────────────────
  // Constraint triggers fire at commit time when DEFERRED. They iterate the
  // affected journals and assert each one sums to zero. This lets an
  // application post a journal as multiple INSERT statements within a tx.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION journal_assert_balanced() RETURNS trigger AS $$
    DECLARE
      bad RECORD;
    BEGIN
      FOR bad IN
        SELECT je.id, COALESCE(SUM(we.signed_amount_kobo), 0) AS sum_kobo
          FROM journal_entries je
          LEFT JOIN wallet_entries we ON we.journal_id = je.id
         GROUP BY je.id
        HAVING COALESCE(SUM(we.signed_amount_kobo), 0) <> 0
      LOOP
        RAISE EXCEPTION 'journal % is unbalanced: lines sum to %',
          bad.id, bad.sum_kobo;
      END LOOP;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql
  `);

  // Constraint triggers must reference a function returning trigger; we gate
  // them on INSERT to wallet_entries because that's where the imbalance
  // surfaces. journal_entries inserts alone don't change the balance.
  pgm.sql(`
    CREATE CONSTRAINT TRIGGER wallet_entries_journal_balanced
      AFTER INSERT ON wallet_entries
      DEFERRABLE INITIALLY DEFERRED
      FOR EACH ROW EXECUTE FUNCTION journal_assert_balanced()
  `);

  // ── 3. Balance maintenance ───────────────────────────────────────────────
  pgm.sql(`
    CREATE OR REPLACE FUNCTION wallet_entry_apply_balance() RETURNS trigger AS $$
    BEGIN
      -- Advisory-lock per account_id so concurrent inserts against the same
      -- account serialize their UPDATE on account_balances. hashtext gives a
      -- stable int4 key from the TEXT account id.
      PERFORM pg_advisory_xact_lock(hashtext('balance:' || NEW.account_id));

      UPDATE account_balances
         SET balance_kobo = balance_kobo + NEW.signed_amount_kobo,
             updated_at   = now()
       WHERE account_id = NEW.account_id;

      IF NOT FOUND THEN
        -- Defensive: if account_balances is missing a row (shouldn't happen
        -- for accounts created via the regular path — they get a 0 row from
        -- migration 0029 / accountFor.user), insert it.
        INSERT INTO account_balances (account_id, balance_kobo, currency)
        VALUES (NEW.account_id, NEW.signed_amount_kobo, NEW.currency)
        ON CONFLICT (account_id) DO UPDATE
          SET balance_kobo = account_balances.balance_kobo + EXCLUDED.balance_kobo,
              updated_at   = now();
      END IF;

      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql
  `);

  pgm.sql(`
    CREATE TRIGGER wallet_entries_balance
      AFTER INSERT ON wallet_entries
      FOR EACH ROW EXECUTE FUNCTION wallet_entry_apply_balance()
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP TRIGGER IF EXISTS wallet_entries_append_only ON wallet_entries`);
  pgm.sql(`DROP TRIGGER IF EXISTS journal_entries_append_only ON journal_entries`);
  pgm.sql(`DROP TRIGGER IF EXISTS wallet_entries_journal_balanced ON wallet_entries`);
  pgm.sql(`DROP TRIGGER IF EXISTS wallet_entries_balance ON wallet_entries`);
  pgm.sql(`DROP FUNCTION IF EXISTS wallet_reject_mutation()`);
  pgm.sql(`DROP FUNCTION IF EXISTS journal_assert_balanced()`);
  pgm.sql(`DROP FUNCTION IF EXISTS wallet_entry_apply_balance()`);
};
