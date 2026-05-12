/**
 * Typography scale.
 *
 * Source of truth: mobile/lib/ui/theme/app_theme.dart. The named presets here
 * mirror the Flutter `TextTheme` so feature code reads the same on both sides.
 */
export const fontFamily = {
  sans: ['"Mona Sans Variable"', '"Mona Sans"', 'system-ui', 'sans-serif'],
} as const;

export const typography = {
  bodyLarge: { size: '16px', weight: 400, color: 'textPrimary' },
  bodyMedium: { size: '14px', weight: 400, color: 'textPrimary' },
  bodySmall: { size: '12px', weight: 400, color: 'textMuted' },
  titleLarge: { size: '22px', weight: 700, color: 'textPrimary' },
  titleMedium: { size: '16px', weight: 600, color: 'textPrimary' },
  titleSmall: { size: '14px', weight: 600, color: 'textPrimary' },
  labelLarge: { size: '14px', weight: 600, color: 'textPrimary' },
} as const;

export type TypographyVariant = keyof typeof typography;
