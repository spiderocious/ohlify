import type { MigrationBuilder } from 'node-pg-migrate';

// Stops charging Paystack's flat fee on top-ups Paystack does not charge it on.
//
// Paystack waives its ₦100 flat component below ₦2,500. `computeFundingCharge`
// added it unconditionally, so a ₦500 top-up was charged ₦607.50 — ₦100 of
// which no processor ever took. The overcharge was invisible from the ledger
// because the ledger balanced against our own inflated charge rather than
// against what Paystack actually collected.
//
// 250_000 kobo = ₦2,500, Paystack's published threshold. Configurable rather
// than compiled in because it is their number, not ours, and it has moved
// before.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    INSERT INTO platform_config (key, value)
    VALUES ('wallet.funding_fee_flat_threshold_kobo', '250000'::jsonb)
    ON CONFLICT (key) DO NOTHING
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DELETE FROM platform_config WHERE key = 'wallet.funding_fee_flat_threshold_kobo'`);
};
