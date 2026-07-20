import { AppText, colors, ProfessionalRatesList } from '@ohlify/mobile-ui';
import { View } from 'react-native';

import type { ProfessionalRate } from '@features/professionals/types/professional-rate';

export interface RatesSectionProps {
  rates: ProfessionalRate[];
}

/** Mirrors mobile/lib/features/professional_details/screen/parts/rates_section.dart. */
export function RatesSection({ rates }: RatesSectionProps) {
  return (
    <View>
      <AppText variant="header" color={colors.textJet} weight="700" align="left">
        Rates
      </AppText>
      <View style={{ height: 10 }} />
      <View style={{ padding: 16, backgroundColor: colors.background, borderRadius: 16 }}>
        <ProfessionalRatesList rates={rates} />
      </View>
    </View>
  );
}
