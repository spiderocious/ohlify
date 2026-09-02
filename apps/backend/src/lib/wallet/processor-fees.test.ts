import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProcessorFeeMode } from '@lib/config/platform-config.service.js';

vi.mock('@lib/config/platform-config.service.js', async (orig) => {
  const actual = await orig<typeof import('@lib/config/platform-config.service.js')>();
  return { ...actual, platformConfig: { wallet: vi.fn() } };
});

const { platformConfig } = await import('@lib/config/platform-config.service.js');
const { computeFundingCharge, fundingCreditKobo } = await import('./processor-fees.js');

/** Paystack NG local cards: 1.5% + ₦100, flat waived under ₦2,500, capped ₦2,000. */
const paystack = (over: Record<string, unknown> = {}) =>
  ({
    funding_fee_mode: ProcessorFeeMode.PASS_ON,
    funding_fee_bps: 150,
    funding_fee_flat_kobo: 10_000,
    funding_fee_cap_kobo: 200_000,
    funding_fee_flat_threshold_kobo: 250_000,
    ...over,
  }) as never;

describe('computeFundingCharge', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('the flat-fee waiver', () => {
    it('does NOT charge the flat fee below the threshold', () => {
      vi.mocked(platformConfig.wallet).mockReturnValue(paystack());

      // The reported bug: funding ₦500 charged ₦607.50, of which ₦100 was a
      // flat fee Paystack never took on a charge that small.
      const c = computeFundingCharge(50_000);

      expect(c.feeKobo).toBe(750); // 1.5% only
      expect(c.chargeKobo).toBe(50_750); // ₦507.50, not ₦607.50
      expect(c.creditKobo).toBe(50_000);
    });

    it('does not charge it on ₦1,000 either', () => {
      vi.mocked(platformConfig.wallet).mockReturnValue(paystack());

      // The second report: ₦1,000 was charged ₦1,115.
      const c = computeFundingCharge(100_000);

      expect(c.feeKobo).toBe(1_500);
      expect(c.chargeKobo).toBe(101_500); // ₦1,015.00
    });

    it('DOES charge it at the threshold', () => {
      vi.mocked(platformConfig.wallet).mockReturnValue(paystack());

      // ₦2,500 exactly — Paystack starts charging the flat fee here.
      const c = computeFundingCharge(250_000);

      expect(c.feeKobo).toBe(3_750 + 10_000);
      expect(c.chargeKobo).toBe(263_750);
    });

    it('DOES charge it above the threshold', () => {
      vi.mocked(platformConfig.wallet).mockReturnValue(paystack());

      const c = computeFundingCharge(500_000); // ₦5,000
      expect(c.feeKobo).toBe(7_500 + 10_000); // ₦175
    });
  });

  describe('the cap', () => {
    it('never exceeds the configured cap', () => {
      vi.mocked(platformConfig.wallet).mockReturnValue(paystack());

      // ₦1,000,000 — 1.5% alone would be ₦15,000, well past the ₦2,000 cap.
      const c = computeFundingCharge(100_000_000);

      expect(c.feeKobo).toBe(200_000);
      expect(c.chargeKobo).toBe(100_200_000);
    });
  });

  describe('fee modes', () => {
    it('pass_on charges the fee on top so the typed amount lands', () => {
      vi.mocked(platformConfig.wallet).mockReturnValue(paystack());

      const c = computeFundingCharge(50_000);
      expect(c.chargeKobo).toBeGreaterThan(c.creditKobo);
      // What the user asked for is what the wallet receives.
      expect(fundingCreditKobo(c.chargeKobo, c.feeKobo)).toBe(50_000);
    });

    it('absorb charges the bare amount and eats the fee', () => {
      vi.mocked(platformConfig.wallet).mockReturnValue(
        paystack({ funding_fee_mode: ProcessorFeeMode.ABSORB }),
      );

      const c = computeFundingCharge(50_000);
      expect(c.chargeKobo).toBe(50_000);
      // The shortfall is real money out of margin, not a rounding artefact.
      expect(c.feeKobo).toBe(750);
    });
  });

  describe('fundingCreditKobo', () => {
    it('credits only what actually arrived', () => {
      // Paystack's settled fee, not our estimate — the two can disagree, and
      // the money that did not arrive cannot be credited.
      expect(fundingCreditKobo(50_750, 750)).toBe(50_000);
    });

    it('credits the gross when no fee was reported', () => {
      expect(fundingCreditKobo(50_000, null)).toBe(50_000);
    });
  });
});
