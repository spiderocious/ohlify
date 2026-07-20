import { Text, type TextProps, type TextStyle } from 'react-native';

import { defaultTextAlign, typography, type TypographyVariant } from '../../theme/typography';

/**
 * Central text component. 1:1 with mobile/lib/ui/widgets/app_text/app_text.dart.
 * Variant list, default per-variant text-align, and exact type scale all
 * mirror the Dart source (see packages/mobile-ui/src/theme/typography.ts for
 * the port of AppTextVariant's `_baseStyle` switch).
 */
export interface AppTextProps extends Omit<TextProps, 'style'> {
  variant?: TypographyVariant;
  color?: string;
  align?: TextStyle['textAlign'];
  weight?: TextStyle['fontWeight'];
  width?: number;
  style?: TextStyle;
}

export function AppText({
  children,
  variant = 'body',
  color,
  align,
  weight,
  width,
  style,
  numberOfLines,
  ...rest
}: AppTextProps) {
  const preset = typography[variant];
  const textStyle: TextStyle = {
    fontFamily: preset.fontFamily,
    fontSize: preset.fontSize,
    lineHeight: preset.lineHeight,
    letterSpacing: preset.letterSpacing,
    color: color ?? preset.color,
    ...(weight ? { fontWeight: weight } : null),
    textAlign: align ?? defaultTextAlign[variant],
    ...(width !== undefined ? { width } : null),
    ...style,
  };

  return (
    <Text style={textStyle} numberOfLines={numberOfLines} {...rest}>
      {children}
    </Text>
  );
}
