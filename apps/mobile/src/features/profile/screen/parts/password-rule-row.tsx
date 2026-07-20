import { AppIcon, AppText, colors } from '@ohlify/mobile-ui';
import { View } from 'react-native';

export interface PasswordRuleRowProps {
  label: string;
  satisfied: boolean;
}

/** Mirrors mobile/lib/features/profile/screen/parts/password_rule_row.dart. */
export function PasswordRuleRow({ label, satisfied }: PasswordRuleRowProps) {
  const color = satisfied ? colors.success : colors.textMuted;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: satisfied ? `${colors.success}26` : colors.surfaceLight,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppIcon name="check" size={12} color={color} />
      </View>
      <View style={{ width: 8 }} />
      <AppText variant="bodyNormal" color={color} align="left">
        {label}
      </AppText>
    </View>
  );
}
