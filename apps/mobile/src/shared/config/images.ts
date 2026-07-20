/**
 * Static image asset registry. Metro resolves binary assets via `require()`,
 * not ES `import` — centralized here (same pattern as fonts.ts) so the
 * require-imports lint exception lives in exactly one file instead of being
 * sprinkled across every screen that renders an image.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
export const IMAGES = {
  splash: require('../../../assets/splash.png'),
  logoPrimary: require('../../../assets/images/logo-primary.png'),
  logoWithTextBlack: require('../../../assets/images/logo-with-text-black.png'),
  logoWithTextWhite: require('../../../assets/images/logo-with-text-white.png'),
  loginPreview: require('../../../assets/images/login-preview.png'),
} as const;
/* eslint-enable @typescript-eslint/no-require-imports */
