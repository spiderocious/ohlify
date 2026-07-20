// Tailwind's Node config loader can't `require()` a .ts file directly, so
// the palette is duplicated here as plain JS. Source of truth remains
// packages/mobile-ui/src/theme/colors.ts (mobile/lib/ui/theme/app_colors.dart)
// — keep these two in sync by hand if a color ever changes.
const colors = {
  primary: '#4A3FE5',
  primaryHover: '#3B31D4',
  secondary: '#E0DEFB',
  tertiary: '#68707E',
  post: '#0D6F82',
  danger: '#FF1E21',
  accent: '#FBBF24',
  surfaceLight: '#F7F7F7',
  surfaceDark: '#F7F6FF',
  background: '#FFFFFF',
  surface: '#F9FAFB',
  textPrimary: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  error: '#DC2626',
  success: '#16A34A',
  warning: '#D97706',
  navBackground: '#F0EFF8',
  navIconInactive: '#5C5A8A',
  textDeepBlue: '#0F0872',
  textSilver: '#807E7E',
  textJet: '#08080C',
  textSlate: '#868C98',
  textCharcoal: '#4F555F',
  textForest: '#1F6F15',
  textBlack: '#000000',
  textWhite: '#FFFFFF',
  textNavy: '#181176',
  textAmber: '#DC6803',
  textDisabled: '#999D9C',
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}', '../../packages/mobile-ui/src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors,
      fontFamily: {
        sans: ['MonaSans-Regular'],
        'sans-medium': ['MonaSans-Medium'],
        'sans-semibold': ['MonaSans-SemiBold'],
        'sans-bold': ['MonaSans-Bold'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        pill: '999px',
      },
    },
  },
  plugins: [],
};
