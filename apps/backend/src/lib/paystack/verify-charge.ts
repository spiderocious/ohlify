import type { PoolClient } from 'pg';

import * as paymentsRepo from '@features/payments/payments.repo.js';
import type { PaymentRow } from '@features/payments/payments.types.js';
import { logger } from '@lib/logger.js';

import { verifyTransaction } from './client.js';

/**
 * Maximum kobo difference tolerated between (verified gross − verified fees)
 * and the originally-authorized payment amount. Paystack occasionally rounds
 * fees by 1 unit; anything beyond a few naira indicates tampering or wrong-
 * merchant traffic and should be rejected.
 */
export const AMOUNT_TOLERANCE_KOBO = 100;

export interface VerifiedCharge {
  amountKobo: number;
  feesKobo: number;
  paidAt: Date;
  channel: string | null;
  customerEmail: string | null;
  currency: string;
}

/**
 * Re-verifies a Paystack charge against the verify-transaction endpoint and
 * runs the full structural + fee-aware amount check.
 *
 * Returns the verified record on success, or null when the charge should be
 * silently rejected (logged inside). Throws `PaystackUpstreamError` on
 * transient upstream failures — the caller is expected to handle that
 * (rollback + retry, or a 5xx response to the user).
 *
 * Two Paystack fee modes are checked:
 *   1. Default (we eat the fee): verified.amount === authorized
 *   2. Pass-on (user eats the fee): verified.amount === authorized + fees
 * Either gross-matches OR net-matches within tolerance.
 */
export const verifyAndCheckCharge = async (
  runner: PoolClient,
  payment: PaymentRow,
): Promise<VerifiedCharge | null> => {
  const reference = payment.reference;
  const verified = await verifyTransaction(reference);

  if (verified.status !== 'success') {
    logger.warn(
      { reference, verifiedStatus: verified.status },
      'paystack verify status is not success; rejecting',
    );
    return null;
  }
  if (verified.currency !== payment.currency) {
    logger.error(
      { reference, paymentCurrency: payment.currency, verifiedCurrency: verified.currency },
      'currency mismatch on charge — rejecting',
    );
    return null;
  }

  const verifiedEmail = verified.raw?.customer?.email ?? null;
  if (verifiedEmail) {
    const payer = await paymentsRepo.findUserEmailById(runner, payment.user_id);
    if (payer && payer.toLowerCase() !== verifiedEmail.toLowerCase()) {
      logger.error(
        { reference, expected: payer, actual: verifiedEmail },
        'customer email mismatch on charge — rejecting',
      );
      return null;
    }
  }

  const verifiedAmount = verified.amount_kobo;
  const verifiedFees = verified.fees_kobo ?? 0;
  const authorized = Number(payment.amount_kobo);

  if (verifiedAmount < authorized - AMOUNT_TOLERANCE_KOBO) {
    logger.error(
      { reference, authorized, verifiedAmount, verifiedFees },
      'verified amount is less than authorized — rejecting',
    );
    return null;
  }
  const grossMatch = Math.abs(verifiedAmount - authorized) <= AMOUNT_TOLERANCE_KOBO;
  const netMatch = Math.abs(verifiedAmount - verifiedFees - authorized) <= AMOUNT_TOLERANCE_KOBO;
  if (!grossMatch && !netMatch) {
    logger.error(
      { reference, authorized, verifiedAmount, verifiedFees },
      'amount mismatch beyond tolerance in either fee mode — rejecting',
    );
    return null;
  }

  return {
    amountKobo: verifiedAmount,
    feesKobo: verifiedFees,
    paidAt: verified.paid_at ? new Date(verified.paid_at) : new Date(),
    channel: verified.channel,
    customerEmail: verifiedEmail,
    currency: verified.currency,
  };
};
