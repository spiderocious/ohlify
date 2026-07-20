import { useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors } from '../../theme/colors';

/** 1:1 with mobile/lib/ui/widgets/app_tag/app_tag.dart. */
export type AppTagVariant = 'solid' | 'outline' | 'subtle' | 'surface';
export type AppTagRadius = 'full' | 'large' | 'small' | 'none';
export type AppTagSize = 'small' | 'medium' | 'large';

export interface AppTagProps {
  label: string;
  variant?: AppTagVariant;
  /** Overrides the default fill/border/text color depending on variant. */
  color?: string;
  size?: AppTagSize;
  radius?: AppTagRadius;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
}

const DEFAULT_TEXT = '#344272';
const DEFAULT_BORDER = '#CED2DD';
const DEFAULT_SURFACE = '#E8F5E9';
const DEFAULT_SUBTLE = '#EEEDF9';

const RADIUS_MAP: Record<AppTagRadius, number> = { full: 999, large: 8, small: 4, none: 0 };
const PADDING_MAP: Record<AppTagSize, { h: number; v: number }> = {
  small: { h: 8, v: 4 },
  medium: { h: 12, v: 6 },
  large: { h: 16, v: 9 },
};
const FONT_SIZE_MAP: Record<AppTagSize, number> = { small: 10, medium: 12, large: 14 };

export function AppTag({
  label,
  variant = 'outline',
  color,
  size = 'medium',
  radius = 'full',
  startIcon,
  endIcon,
  onPress,
  disabled = false,
}: AppTagProps) {
  const [isPressed, setIsPressed] = useState(false);
  const padding = PADDING_MAP[size];

  const backgroundColor =
    variant === 'solid'
      ? (color ?? colors.primary)
      : variant === 'surface'
        ? (color ?? DEFAULT_SURFACE)
        : variant === 'subtle'
          ? DEFAULT_SUBTLE
          : 'transparent';
  const textColor =
    variant === 'solid'
      ? colors.textWhite
      : variant === 'surface'
        ? (color ?? '#1F6F15')
        : (color ?? DEFAULT_TEXT);
  const borderColor = variant === 'outline' ? (color ?? DEFAULT_BORDER) : undefined;

  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: padding.h,
        paddingVertical: padding.v,
        backgroundColor,
        borderRadius: RADIUS_MAP[radius],
        borderWidth: borderColor ? 1 : 0,
        borderColor,
        opacity: disabled ? 0.45 : isPressed ? 0.85 : 1,
      }}
    >
      {startIcon ? <View style={{ marginRight: 5 }}>{startIcon}</View> : null}
      <Text
        style={{
          fontFamily: 'MonaSans-SemiBold',
          fontSize: FONT_SIZE_MAP[size],
          fontWeight: '600',
          color: textColor,
          letterSpacing: 0.4,
        }}
      >
        {label}
      </Text>
      {endIcon ? <View style={{ marginLeft: 5 }}>{endIcon}</View> : null}
    </View>
  );

  if (!onPress || disabled) return content;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
    >
      {content}
    </Pressable>
  );
}
