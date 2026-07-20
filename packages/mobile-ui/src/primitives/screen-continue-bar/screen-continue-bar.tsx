import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '../../icons/app-icons';
import { colors } from '../../theme/colors';

/**
 * Sticky bottom action bar used across onboarding/auth screens. 1:1 with
 * mobile/lib/ui/widgets/screen_continue_bar/screen_continue_bar.dart —
 * label on the left, white circle chevron on the right, dims when
 * onPress is undefined.
 */
export interface ScreenContinueBarProps {
  onPress?: () => void;
  label?: string;
}

export function ScreenContinueBar({ onPress, label = 'Continue' }: ScreenContinueBarProps) {
  const isEnabled = onPress !== undefined;
  const insets = useSafeAreaInsets();

  return (
    <Pressable onPress={onPress} disabled={!isEnabled}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: isEnabled ? colors.primary : `${colors.primary}80`,
          paddingHorizontal: 24,
          paddingTop: 18,
          paddingBottom: 18 + insets.bottom,
        }}
      >
        <Text
          style={{
            fontFamily: 'MonaSans-SemiBold',
            fontSize: 16,
            fontWeight: '600',
            color: colors.textWhite,
          }}
        >
          {label}
        </Text>
        <View style={{ flex: 1 }} />
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.textWhite,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppIcon name="chevronRight" size={20} color={colors.primary} />
        </View>
      </View>
    </Pressable>
  );
}
