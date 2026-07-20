/**
 * MonaSans font weight map for expo-font's useFonts(). Source: the 16 TTFs
 * ported verbatim from mobile/assets/fonts/ (mobile/pubspec.yaml:76-101).
 * Keys are the family names referenced by packages/mobile-ui/src/theme/typography.ts.
 *
 * Metro resolves static binary assets (fonts, images) via `require()`, not
 * ES `import` — this is the standard RN/Expo asset-loading mechanism, not a
 * web-style CJS import.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
export const FONT_ASSETS = {
  'MonaSans-ExtraLight': require('../../../assets/fonts/MonaSans-ExtraLight.ttf'),
  'MonaSans-ExtraLightItalic': require('../../../assets/fonts/MonaSans-ExtraLightItalic.ttf'),
  'MonaSans-Light': require('../../../assets/fonts/MonaSans-Light.ttf'),
  'MonaSans-LightItalic': require('../../../assets/fonts/MonaSans-LightItalic.ttf'),
  'MonaSans-Regular': require('../../../assets/fonts/MonaSans-Regular.ttf'),
  'MonaSans-Italic': require('../../../assets/fonts/MonaSans-Italic.ttf'),
  'MonaSans-Medium': require('../../../assets/fonts/MonaSans-Medium.ttf'),
  'MonaSans-MediumItalic': require('../../../assets/fonts/MonaSans-MediumItalic.ttf'),
  'MonaSans-SemiBold': require('../../../assets/fonts/MonaSans-SemiBold.ttf'),
  'MonaSans-SemiBoldItalic': require('../../../assets/fonts/MonaSans-SemiBoldItalic.ttf'),
  'MonaSans-Bold': require('../../../assets/fonts/MonaSans-Bold.ttf'),
  'MonaSans-BoldItalic': require('../../../assets/fonts/MonaSans-BoldItalic.ttf'),
  'MonaSans-ExtraBold': require('../../../assets/fonts/MonaSans-ExtraBold.ttf'),
  'MonaSans-ExtraBoldItalic': require('../../../assets/fonts/MonaSans-ExtraBoldItalic.ttf'),
  'MonaSans-Black': require('../../../assets/fonts/MonaSans-Black.ttf'),
  'MonaSans-BlackItalic': require('../../../assets/fonts/MonaSans-BlackItalic.ttf'),
} as const;
/* eslint-enable @typescript-eslint/no-require-imports */
