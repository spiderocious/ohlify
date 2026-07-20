/**
 * Text style presets — React Native port.
 *
 * Source of truth: mobile/lib/ui/widgets/app_text/app_text.dart (the
 * AppTextVariant enum + _baseStyle switch), which is richer than and takes
 * precedence over mobile/lib/ui/theme/app_theme.dart's ThemeData.textTheme —
 * AppText is what real screens actually use. `lineHeight` values here are
 * absolute px (React Native's lineHeight is absolute, not a multiplier like
 * Flutter's `height` which is relative to fontSize) — computed as
 * fontSize * height from the Dart source.
 */
export type TypographyVariant =
  | 'title'
  | 'subtitle'
  | 'header'
  | 'subheader'
  | 'label'
  | 'medium'
  | 'bodyTitle'
  | 'body'
  | 'bodySmall'
  | 'bodySmallest'
  | 'bodyNormal';

interface TextStylePreset {
  fontFamily: string;
  fontWeight: '400' | '500' | '600';
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  color: string;
}

const FONT_REGULAR = 'MonaSans-Regular';
const FONT_MEDIUM = 'MonaSans-Medium';
const FONT_SEMIBOLD = 'MonaSans-SemiBold';

export const typography: Record<TypographyVariant, TextStylePreset> = {
  title: {
    fontFamily: FONT_SEMIBOLD,
    fontWeight: '600',
    fontSize: 24,
    lineHeight: 40,
    letterSpacing: -0.48,
    color: '#111827',
  },
  subtitle: {
    fontFamily: FONT_REGULAR,
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 24,
    letterSpacing: 0,
    color: '#6B7280',
  },
  header: {
    fontFamily: FONT_SEMIBOLD,
    fontWeight: '600',
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: 0,
    color: '#111827',
  },
  subheader: {
    fontFamily: FONT_REGULAR,
    fontWeight: '400',
    fontSize: 16,
    lineHeight: 16,
    letterSpacing: 0,
    color: '#111827',
  },
  label: {
    fontFamily: FONT_REGULAR,
    fontWeight: '400',
    fontSize: 12,
    lineHeight: 21,
    letterSpacing: 0,
    color: '#6B7280',
  },
  medium: {
    fontFamily: FONT_SEMIBOLD,
    fontWeight: '600',
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 0,
    color: '#111827',
  },
  bodyTitle: {
    fontFamily: FONT_MEDIUM,
    fontWeight: '500',
    fontSize: 20,
    lineHeight: 32,
    letterSpacing: 0,
    color: '#111827',
  },
  body: {
    fontFamily: FONT_REGULAR,
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: '#111827',
  },
  bodyNormal: {
    fontFamily: FONT_MEDIUM,
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 17, // 20/14 ratio applied to 12px in source, kept as authored
    letterSpacing: -0.14,
    color: '#111827',
  },
  bodySmall: {
    fontFamily: FONT_MEDIUM,
    fontWeight: '500',
    fontSize: 10,
    lineHeight: 14, // 20/14 ratio applied to 10px in source, kept as authored
    letterSpacing: -0.14,
    color: '#111827',
  },
  bodySmallest: {
    fontFamily: FONT_REGULAR,
    fontWeight: '400',
    fontSize: 8,
    lineHeight: 11, // 20/14 ratio applied to 8px in source, kept as authored
    letterSpacing: -0.14,
    color: '#111827',
  },
};

/** Default text-align per variant, mirroring AppText._defaultAlign. */
export const defaultTextAlign: Record<TypographyVariant, 'left' | 'center'> = {
  title: 'left',
  subtitle: 'center',
  header: 'left',
  subheader: 'left',
  label: 'left',
  medium: 'center',
  bodyTitle: 'left',
  body: 'center',
  bodyNormal: 'left',
  bodySmall: 'left',
  bodySmallest: 'left',
};
