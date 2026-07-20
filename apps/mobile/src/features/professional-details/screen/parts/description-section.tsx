import { AppText, colors } from '@ohlify/mobile-ui';
import { View } from 'react-native';

export interface DescriptionSectionProps {
  description: string;
}

/** Mirrors mobile/lib/features/professional_details/screen/parts/description_section.dart. */
export function DescriptionSection({ description }: DescriptionSectionProps) {
  return (
    <View>
      <AppText variant="header" color={colors.textJet} weight="700" align="left">
        About
      </AppText>
      <View style={{ height: 10 }} />
      <View style={{ padding: 16, backgroundColor: colors.background, borderRadius: 16 }}>
        <AppText variant="body" color={colors.textJet} align="left">
          {description}
        </AppText>
      </View>
    </View>
  );
}
