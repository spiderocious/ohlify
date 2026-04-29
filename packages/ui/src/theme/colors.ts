/**
 * Canonical Ohlify color palette.
 *
 * Source of truth: mobile/lib/ui/theme/app_colors.dart. Mirror these values
 * exactly so mobile and web stay visually identical.
 */
export const colors = {
  primary: '#4A3FE5',
  primaryHover: '#3B31D4',
  secondary: '#E0DEFB',
  tertiary: '#68707E',
  post: '#0D6F82',
  callico: '#5E5E5E2E',
  danger: '#FF1E21',
  accent: '#FBBF24',
  surfaceLight: '#F7F7F7',
  surfaceDark: '#F7F6FF',

  background: '#FFFFFF',
  surface: '#F9FAFB',
  border: '#E5E7EB',

  error: '#DC2626',
  success: '#16A34A',
  warning: '#D97706',

  textPrimary: '#111827',
  textMuted: '#6B7280',
  textDeepBlue: '#0F0872',
  textSilver: '#807E7E',
  textJet: '#08080C',
  textSlate: '#868C98',
  textCharcoal: '#4F555F',
  textForest: '#1F6F15',
  textNavy: '#181176',
  textAmber: '#DC6803',
  textDisabled: '#999D9C',
  textWhite: '#FFFFFF',
  textBlack: '#000000',

  toastSuccessBg: '#3FB12C',
  toastErrorBg: '#D80027',
  toastWarningBg: '#92400E',
  toastInfoBg: '#1E3A5F',
  toastSuccessIcon: '#4ADE80',
  toastErrorIcon: '#FCA5A5',
  toastWarningIcon: '#FCD34D',
  toastInfoIcon: '#93C5FD',

  navBackground: '#F0EFF8',
  navIconInactive: '#5C5A8A',
} as const;

export type ColorToken = keyof typeof colors;
