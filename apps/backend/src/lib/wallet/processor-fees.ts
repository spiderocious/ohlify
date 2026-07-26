import { platformConfig, ProcessorFeeMode } from '@lib/config/platform-config.service.js';

export interface FundingCharge {
  /** What the user asked to land in their wallet. */
  creditKobo: number;
  /** The processor's cut, quoted up front. */
  feeKobo: number;
  /** What Paystack actually collects from the card. */
  chargeKobo: number;
}

/**
 * Works out the processor fee on a funding, and who carries it.
 *
 * Paystack charges a percentage plus a flat component, capped. Under
 * `pass_on` the user is charged that on top of what they asked for, so the
 * amount they typed is the amount that arrives; under `absorb` the platform
 * takes it out of margin and the card is charged the bare amount.
 *
 * Quoting this before checkout matters: previously the fee was silently
 * netted off on the way in, so asking to fund ₦10,000 landed ₦9,750 with no
 * explanation of where the rest went.
 */
export const computeFundingCharge = (creditKobo: number): FundingCharge => {
  const cfg = platformConfig.wallet();
  const uncapped =
    Math.ceil((creditKobo * cfg.funding_fee_bps) / 10_000) + cfg.funding_fee_flat_kobo;
  const feeKobo = Math.min(uncapped, cfg.funding_fee_cap_kobo);

  if (cfg.funding_fee_mode === ProcessorFeeMode.ABSORB) {
    return { creditKobo, feeKobo, chargeKobo: creditKobo };
  }
  return { creditKobo, feeKobo, chargeKobo: creditKobo + feeKobo };
};

/**
 * How much of a settled charge reaches the user's wallet.
 *
 * Only ever gross minus what Paystack actually took — the money that didn't
 * arrive cannot be credited, in either mode. The modes differ at initiation,
 * not here: `pass_on` has already inflated the charge so this subtraction
 * still lands the amount the user asked for, while `absorb` charged the bare
 * amount and the shortfall comes out of platform margin.
 */
export const fundingCreditKobo = (grossKobo: number, actualFeeKobo: number | null): number =>
  grossKobo - (actualFeeKobo ?? 0);

/**
 * The processor's charge for a payout. Flat per transfer.
 *
 * Under `absorb` the professional receives exactly what they requested and the
 * platform eats the fee — which is why it has to reach the ledger as its own
 * line, or `platform_revenue` reads as profit while quietly being gross margin.
 */
export const computeWithdrawalFeeKobo = (): number =>
  platformConfig.wallet().withdrawal_fee_flat_kobo;
