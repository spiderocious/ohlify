import { View } from 'react-native';

import { AppText } from '../../primitives/app-text/app-text';
import { colors } from '../../theme/colors';

/**
 * Reusable KYC / setup progress card used by the professional and client
 * onboarding flows. 1:1 with
 * mobile/lib/ui/widgets/kyc_progress_header/kyc_progress_header.dart.
 */
export interface KycProgressHeaderProps {
  completed: number;
  total: number;
  percent: number;
  title?: string;
}

export function KycProgressHeader({
  completed,
  total,
  percent,
  title = 'Complete your profile',
}: KycProgressHeaderProps) {
  const ratio = total === 0 ? 0 : completed / total;

  return (
    <View
      style={{ width: '100%', padding: 18, backgroundColor: colors.background, borderRadius: 20 }}
    >
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}
      >
        <View style={{ flex: 1 }}>
          <AppText variant="medium" color={colors.textJet} weight="700" align="left">
            {title}
          </AppText>
          <View style={{ height: 4 }} />
          <AppText variant="body" color={colors.textMuted} align="left">
            {completed} of {total} steps done
          </AppText>
        </View>
        <AppText variant="header" color={colors.primary} weight="700" align="right">
          {percent}%
        </AppText>
      </View>
      <View style={{ height: 14 }} />
      <View
        style={{
          height: 8,
          borderRadius: 100,
          backgroundColor: colors.surfaceLight,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: 8,
            width: `${Math.round(ratio * 100)}%`,
            backgroundColor: colors.primary,
            borderRadius: 100,
          }}
        />
      </View>
    </View>
  );
}
