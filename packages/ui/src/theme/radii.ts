/** Radii used throughout the mobile app, mirrored for web. */
export const radii = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  pill: '999px',
} as const;

export type RadiusToken = keyof typeof radii;
