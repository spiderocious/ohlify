import type { ProfessionalRate } from '@ohlify/core';
import { formatNaira } from '@ohlify/core';
import type { ApiRate } from '@ohlify/api';
import { AppText, ProfessionalRatesList } from '@ohlify/ui';

interface RatesSectionProps {
  rates: ReadonlyArray<ApiRate>;
  /** Tap a rate row to jump into schedule-call with that rate pre-locked. */
  onSelect?: (rate: ApiRate) => void;
}

function toViewRate(r: ApiRate): ProfessionalRate {
  return {
    callType: r.call_type,
    durationMinutes: r.duration_minutes,
    price: formatNaira(r.price_kobo),
  };
}

/** Mirrors mobile/lib/features/professional_details/screen/parts/rates_section.dart. */
export function RatesSection({ rates, onSelect }: RatesSectionProps) {
  const viewRates = rates.map(toViewRate);
  const handleSelect = onSelect
    ? (vr: ProfessionalRate) => {
        const match = rates.find(
          (r) => r.call_type === vr.callType && r.duration_minutes === vr.durationMinutes,
        );
        if (match) onSelect(match);
      }
    : undefined;

  return (
    <div>
      <AppText variant="header" weight={700} align="start" color="var(--ohl-text-jet)">
        Rates
      </AppText>
      <div className="mt-2.5 rounded-2xl bg-background p-4">
        <ProfessionalRatesList rates={viewRates} onSelect={handleSelect} />
      </div>
    </div>
  );
}
