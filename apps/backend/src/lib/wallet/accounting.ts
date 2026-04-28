// Sign convention reference + journal-line builders.
//
// ## Convention (banker-style, per Q2)
//
// `wallet_entries.signed_amount_kobo` is positive when the account's balance
// should INCREASE, negative when it should DECREASE. Every journal sums to
// zero across its lines (enforced by deferred constraint trigger).
//
// In traditional accounting:
//   - User wallets, system asset accounts (paystack_clearing,
//     platform_revenue, platform_promo, suspense, pending_debits_pool):
//     positive = credit-to-account (increase). Maps to standard "debit"
//     bookkeeping = inflow.
//   - Liability accounts (paystack_fees, paystack_payouts):
//     positive = increase the liability owed.
//
// In code we don't carry the asset/liability flag — every entry is just a
// signed integer against one account, and the journal sum-to-zero invariant
// guarantees correctness regardless of account flavor.
//
// ## Reference flows
//
// All flows below are implemented in `lib/wallet/flows/`. Each line below is
// `account → signed_amount_kobo`. Every block sums to zero.
//
// 1. Wallet funding (Paystack)
//
//    Journal: wallet_funding   idempotency_key: paystack:evt_<id>
//      user_wallet(u_caller):     +net_kobo
//      paystack_fees:             +fee_kobo
//      paystack_clearing:         -gross_kobo
//
//    Where gross = net + fee. The user gains `net` (what landed in our hands).
//    Paystack's fee is recorded as a liability account increase so we can
//    answer "how much has Paystack charged us this month?".
//
// 2. Call payment reserve (when user pays for a call from wallet)
//
//    Journal: call_payment_reserve   idempotency_key: call:<id>:reserve
//      pending_debits_pool:       +amount_kobo
//      user_wallet(u_caller):     -amount_kobo
//
//    User's available balance drops; money is parked in pending pool until
//    the call settles or refunds.
//
// 3. Call settlement (call completed)
//
//    Journal: call_settlement   idempotency_key: call:<id>:settle
//      callee_wallet(u_pro):      +(amount - platform_fee)
//      platform_revenue:          +platform_fee
//      pending_debits_pool:       -amount_kobo
//
// 4. Call refund (pre-settlement — most common cancel case)
//
//    Journal: call_refund   idempotency_key: call:<id>:refund:<reason>
//      user_wallet(u_caller):     +amount_kobo
//      pending_debits_pool:       -amount_kobo
//
// 5. Call refund (post-settlement — admin-only clawback)
//
//    Journal: call_refund_post_settle   idempotency_key: refund:<refund_id>
//      user_wallet(u_caller):     +amount_kobo
//      callee_wallet(u_pro):      -(amount - platform_fee)
//      platform_revenue:          -platform_fee
//
// 6. Withdrawal requested
//
//    Journal: withdrawal_requested   idempotency_key: wd:<id>:requested
//      paystack_payouts:          +amount_kobo
//      user_wallet(u_pro):        -amount_kobo
//
// 7. Withdrawal completed (Paystack confirms transfer succeeded)
//
//    Journal: withdrawal_completed   idempotency_key: wd:<id>:completed
//      paystack_payouts:          -amount_kobo
//      paystack_clearing:         +amount_kobo
//
//    paystack_clearing is a contra-asset (negative on funding inflows). An
//    outflow walks it back toward zero, which is positive in our signed
//    convention. Net across requested+completed: user_wallet -amount,
//    paystack_clearing +amount, paystack_payouts net 0.
//
// 8. Withdrawal reversed (Paystack reports transfer failed)
//
//    Journal: withdrawal_reversed   idempotency_key: wd:<id>:reversed
//      user_wallet(u_pro):        +amount_kobo
//      paystack_payouts:          -amount_kobo
//
// 9. Admin manual journal — admin enters arbitrary lines (must sum to zero).
//    idempotency_key: manual:<admin_id>:<ulid>
//
// 10. Admin credit (convenience: gift money to user from platform_promo)
//
//    Journal: admin_credit   idempotency_key: admin_credit:<ulid>
//      user_wallet(u_x):          +amount_kobo
//      platform_promo:            -amount_kobo
//
// 11. Admin debit (convenience: take money from user to suspense)
//
//    Journal: admin_debit   idempotency_key: admin_debit:<ulid>
//      suspense:                  +amount_kobo
//      user_wallet(u_x):          -amount_kobo
//
// ## Idempotency key convention
//
// `<flow>:<resource_id>:<phase>?:<extra>?`
//
// Examples:
//   paystack:evt_abc123                 — webhook event
//   call:c_xyz:reserve                  — call payment reserve
//   call:c_xyz:settle                   — call settlement
//   call:c_xyz:refund:cancelled         — refund tied to a cancellation
//   wd:wd_xxx:requested                 — withdrawal request journal
//   wd:wd_xxx:completed                 — withdrawal completion
//   manual:adm_xxx:01jkqx...            — admin manual journal
//
// Replay of any journal posts the SAME idempotency_key, hits the UNIQUE
// constraint, and is a no-op.

export interface JournalLineInput {
  accountId: string;
  signedAmountKobo: number;
  currency?: string;
}

// Verifies a journal's lines sum to zero. Application-level guard mirrors the
// DB trigger — fails fast at the service layer instead of bubbling a deferred
// constraint exception out of the tx commit.
export const assertBalanced = (lines: readonly JournalLineInput[]): void => {
  let sum = 0;
  for (const l of lines) sum += l.signedAmountKobo;
  if (sum !== 0) {
    throw new Error(`journal lines must sum to zero, got ${sum}`);
  }
  if (lines.length < 2) {
    throw new Error(`journal must have at least 2 lines, got ${lines.length}`);
  }
  for (const l of lines) {
    if (!Number.isInteger(l.signedAmountKobo)) {
      throw new Error(`signed_amount_kobo must be an integer, got ${l.signedAmountKobo}`);
    }
    if (l.signedAmountKobo === 0) {
      throw new Error('zero-amount lines are not allowed');
    }
  }
};

// Computes platform fee in kobo from amount + bps. e.g. amount=300_000, bps=1500
// → 45_000 (15%). Floors to integer kobo.
export const computePlatformFee = (amountKobo: number, feeBps: number): number => {
  if (!Number.isInteger(amountKobo) || amountKobo < 0) {
    throw new Error(
      `computePlatformFee: amountKobo must be non-negative integer, got ${amountKobo}`,
    );
  }
  if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > 10_000) {
    throw new Error(`computePlatformFee: feeBps must be integer 0-10000, got ${feeBps}`);
  }
  return Math.floor((amountKobo * feeBps) / 10_000);
};
