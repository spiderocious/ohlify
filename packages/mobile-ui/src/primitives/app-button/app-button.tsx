import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors } from '../../theme/colors';

/**
 * A flexible branded button with four visual variants. 1:1 with
 * mobile/lib/ui/widgets/app_button/app_button.dart.
 *
 * RN has no IntrinsicWidth equivalent — the "size to content, don't stretch"
 * behavior Flutter gets from wrapping in IntrinsicWidth is achieved here via
 * `alignSelf: 'flex-start'` on the non-expanded, non-fixed-width case, which
 * is the standard RN/flexbox way to make a child hug its content instead of
 * stretching to the cross-axis size of its flex parent.
 */
export type AppButtonVariant = 'solid' | 'outline' | 'plain' | 'subtle';

export interface AppButtonProps {
  label?: string;
  /** Replaces the default label+icon layout entirely. */
  children?: ReactNode;
  onPress?: () => void;
  variant?: AppButtonVariant;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  isLoading?: boolean;
  isDisabled?: boolean;
  radius?: number;
  width?: number;
  height?: number;
  /** Stretch to fill available horizontal space. */
  expanded?: boolean;
  paddingHorizontal?: number;
  textStyle?: TextStyle;
  /** Whether to show a border. Defaults to true for 'outline', false otherwise. Pass explicitly to override. */
  bordered?: boolean;
  /** Border color when bordered is true. Defaults to colors.border. 'outline' uses colors.primary unless overridden. */
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const BACKGROUND_BY_VARIANT: Record<AppButtonVariant, string> = {
  solid: colors.primary,
  outline: 'transparent',
  plain: colors.secondary,
  subtle: colors.background,
};

const FOREGROUND_BY_VARIANT: Record<AppButtonVariant, string> = {
  solid: colors.textWhite,
  outline: colors.primary,
  plain: colors.primary,
  subtle: colors.primary,
};

export function AppButton({
  label,
  children,
  onPress,
  variant = 'solid',
  startIcon,
  endIcon,
  isLoading = false,
  isDisabled = false,
  radius = 12,
  width,
  height = 52,
  expanded = false,
  paddingHorizontal = 16,
  textStyle,
  bordered,
  borderColor = colors.border,
  style,
  testID,
}: AppButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const effectivelyDisabled = isDisabled || isLoading || onPress === undefined;

  const isBordered = bordered ?? variant === 'outline';
  const effectiveBorderColor =
    variant === 'outline' && bordered === undefined ? colors.primary : borderColor;
  const foreground = FOREGROUND_BY_VARIANT[variant];

  const containerStyle: ViewStyle = {
    height,
    width: expanded ? '100%' : width,
    alignSelf: expanded || width !== undefined ? undefined : 'flex-start',
    backgroundColor: BACKGROUND_BY_VARIANT[variant],
    borderRadius: radius,
    borderWidth: isBordered ? 1.5 : 0,
    borderColor: isBordered ? effectiveBorderColor : undefined,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal,
    opacity: effectivelyDisabled ? 0.45 : isPressed ? 0.85 : 1,
  };

  const labelStyle: TextStyle = {
    fontFamily: 'MonaSans-SemiBold',
    fontSize: 16,
    fontWeight: '600',
    color: foreground,
    ...textStyle,
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
      {children ?? (
        <View className="flex-row items-center">
          {startIcon}
          {startIcon ? <View className="w-2" /> : null}
          {isLoading ? (
            <ActivityIndicator size="small" color={foreground} />
          ) : (
            <Text style={labelStyle}>{label}</Text>
          )}
          {endIcon ? <View className="ml-auto">{endIcon}</View> : null}
        </View>
      )}
    </Pressable>
  );
}
