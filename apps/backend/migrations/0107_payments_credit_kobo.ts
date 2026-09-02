import type { MigrationBuilder } from 'node-pg-migrate';

// Records what the user actually asked to land in their wallet.
//
// Funding used to credit `gross - paystack_fee`, reconstructing the intent
// from whatever the processor happened to charge. That works only while our
// arithmetic and Paystack's agree exactly — and they did not. With
// "customer bears transaction charge" enabled on the Paystack account, they
// grossed our already-grossed charge UP AGAIN, so a ₦500 top-up hit the card
// for ₦616.76 and the fee was applied twice. The ledger balanced throughout,
// because it balanced against our own inflated figure.
//
// Storing the requested credit at initiation makes the settlement a lookup
// rather than a derivation: whatever the processor does to the charge, the
// wallet receives the amount the user asked for, and any gap surfaces as a
// reconciliation difference instead of silently moving the credit.
//
// Nullable: rows written before this migration have no recorded intent, and
// the service falls back to the old derivation for them rather than guessing.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`ALTER TABLE payments ADD COLUMN credit_kobo BIGINT`);

  pgm.sql(`
    COMMENT ON COLUMN payments.credit_kobo IS
      'What the user asked to receive, recorded at initiation. NULL for rows predating migration 0107.'
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`ALTER TABLE payments DROP COLUMN IF EXISTS credit_kobo`);
};
