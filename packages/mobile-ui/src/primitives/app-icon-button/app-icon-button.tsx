import { useState, type ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '../../theme/colors';

/**
 * A branded icon-only button. 1:1 with
 * mobile/lib/ui/widgets/app_icon_button/app_icon_button.dart.
 */
export type AppIconButtonVariant = 'filled' | 'outline' | 'ghost';
export type AppIconButtonShape = 'circle' | 'squircle';

export interface AppIconButtonProps {
  icon: ReactNode;
  onPress?: () => void;
  variant?: AppIconButtonVariant;
  shape?: AppIconButtonShape;
  backgroundColor?: string;
  borderColor?: string;
  /** Overall tap target and container size. */
  size?: number;
  isDisabled?: boolean;
  /** Corner radius when shape is 'squircle'. */
  squircleRadius?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const DEFAULT_BG_BY_VARIANT: Record<AppIconButtonVariant, string> = {
  filled: colors.primary,
  outline: 'transparent',
  ghost: colors.callico,
};

export function AppIconButton({
  icon,
  onPress,
  variant = 'filled',
  shape = 'circle',
  backgroundColor,
  borderColor,
  size = 52,
  isDisabled = false,
  squircleRadius = 16,
  style,
  testID,
}: AppIconButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const effectivelyDisabled = isDisabled || onPress === undefined;
  const effectiveBg = backgroundColor ?? DEFAULT_BG_BY_VARIANT[variant];

  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: shape === 'circle' ? size / 2 : squircleRadius,
    backgroundColor: effectiveBg,
    borderWidth: variant === 'outline' ? 2.5 : 0,
    borderColor: variant === 'outline' ? (borderColor ?? colors.primary) : undefined,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: effectivelyDisabled ? 0.45 : isPressed ? 0.85 : 1,
  };

  return (
    <Pressable
      onPress={effectivelyDisabled ? undefined : onPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      disabled={effectivelyDisabled}
      style={[containerStyle, style]}
      testID={testID}
    >
      <View>{icon}</View>
    </Pressable>
  );
}
