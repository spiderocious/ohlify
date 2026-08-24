/**
 * Size scales are scoped per component. CONTRACTS §7.
 *
 * There is no global `sm | md | lg`. Each component exposes exactly what it
 * needs, sourced from one underlying step scale, so a caller cannot pass a size
 * a component has no rendering for.
 *
 * **Register modifies size, not the scale.** The same `md` button is 48px in
 * PASS and 34px in BOARD — one name, two heights, resolved by the CSS variable
 * the register zone sets. Callers never spell that out.
 */

/** Button. */
export type HawkButtonSize = 'sm' | 'md' | 'lg';

/** Icon button — one step below button, since a bare glyph reads smaller. */
export type HawkIconButtonSize = 'xs' | 'sm' | 'md' | 'lg';

/** Avatar. */
export type HawkAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** Chip / filter chip. */
export type HawkChipSize = 'sm' | 'md';

/** Figure — the money/duration face. `display` is the wallet-hero slot. */
export type HawkFigureSize = 'sm' | 'md' | 'lg' | 'display';

/** Badge. */
export type HawkBadgeSize = 'sm' | 'md';

/** Avatar diameters, in px. */
export const HAWK_AVATAR_PX: Record<HawkAvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

/** Icon-button edge, in px. Register-independent: a glyph target is a target. */
export const HAWK_ICON_BUTTON_PX: Record<HawkIconButtonSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
};

/** The glyph inside an icon button. */
export const HAWK_ICON_BUTTON_GLYPH_PX: Record<HawkIconButtonSize, number> = {
  xs: 13,
  sm: 16,
  md: 18,
  lg: 20,
};
