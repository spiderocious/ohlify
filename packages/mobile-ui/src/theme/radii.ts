/**
 * Radii used throughout the mobile app.
 *
 * Source: mobile/lib/ui/theme/app_theme.dart (inputs/buttons use 8),
 * cross-checked against packages/ui/src/theme/radii.ts (the web port's
 * scale, used only as a secondary sanity check).
 */
export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof radii;
