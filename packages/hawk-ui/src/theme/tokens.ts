/**
 * Design tokens, as TypeScript.
 *
 * The CSS variables in `styles.css` are the runtime source of truth; this file
 * mirrors them for the cases where a value must reach JavaScript — a chart
 * computing a bar height, a motion duration passed to `setTimeout`, a canvas
 * fill. Components reach for Tailwind classes first and these constants only
 * when a value is genuinely dynamic.
 */

/** Motion. Retained verbatim from the app's own tokens. CONTRACTS §11. */
export const HawkDuration = {
  /** Press. */
  instant: 100,
  /** Toggle, chip. */
  fast: 180,
  /** Entrance, modal, tab. */
  base: 280,
  /** Full-screen, celebration. */
  slow: 450,
} as const;

export const HawkEasing = {
  standard: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
  decelerate: 'cubic-bezier(0.34, 1.36, 0.64, 1)',
  linear: 'linear',
} as const;

/** Lists stagger on first populate only: 35ms per item, capped at 8. */
export const HAWK_STAGGER_STEP_MS = 35;
export const HAWK_STAGGER_CAP = 8;

/** The scrim/content split. CONTRACTS §4 — content trails the scrim by 40ms. */
export const HawkOverlayTiming = {
  scrimMs: 200,
  contentMs: 280,
  contentDelayMs: 40,
} as const;

/** Spacing steps, in px. */
export const HawkSpace = {
  s0: 0,
  s1: 2,
  s2: 4,
  s3: 6,
  s4: 8,
  s5: 12,
  s6: 16,
  s7: 20,
  s8: 24,
  s9: 32,
  s10: 40,
  s11: 48,
  s12: 64,
} as const;

/** Radii, in px. Register-aware radii come from `--hawk-rad`, not this table. */
export const HawkRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

/** The z-scale, named. */
export const HawkZ = {
  base: 0,
  raised: 10,
  sticky: 100,
  header: 200,
  drawer: 300,
  scrim: 400,
  modal: 500,
  popover: 600,
  toast: 700,
  tooltip: 800,
  critical: 900,
} as const;

/**
 * Raw colour values, for the cases that cannot use a CSS variable — an SVG
 * `fill` computed in JS, a canvas, a chart gradient stop.
 *
 * Components should prefer the Tailwind classes. Reaching for a hex here to
 * paint a background is exactly the hand-mixing the quartet exists to stop.
 */
export const HawkPalette = {
  // Violet ramp
  v50: '#F2F1FE',
  v100: '#E9E7FD',
  v200: '#D5D1FB',
  v300: '#B3ACF7',
  v400: '#8A7FF1',
  v500: '#4A3FE5',
  v600: '#3B31D4',
  v700: '#2F27AE',
  v800: '#282287',
  v900: '#1E1A5E',
  v950: '#12103A',

  // Ink ramp
  n0: '#FFFFFF',
  n25: '#FAFAFC',
  n50: '#F4F3F8',
  n100: '#ECEBF2',
  n200: '#DFDDE8',
  n300: '#C6C3D2',
  n400: '#9E9BAD',
  n500: '#7A7788',
  n600: '#5D5A6B',
  n700: '#454250',
  n800: '#2B2935',
  n900: '#1A1822',
  n950: '#101018',

  // Semantic hues
  g50: '#E8F5EE',
  g100: '#CDEADC',
  g500: '#0F7A4C',
  g600: '#0B6E44',
  g700: '#085534',
  a50: '#FDF3E3',
  a100: '#FAE6C4',
  a500: '#A66008',
  a600: '#8F5407',
  a700: '#6E4005',
  r50: '#FCEAEB',
  r100: '#F8D2D4',
  r500: '#B01A20',
  r600: '#9C1218',
  r700: '#7A0E13',
  b50: '#E8F0FD',
  b100: '#CFE0FA',
  b500: '#1A5FBF',
  b600: '#154E9E',
  b700: '#103A76',

  // Named surfaces
  paper: '#FFFFFF',
  ground: '#EDEBF3',
  callGround: '#08080C',
  hazard: '#C2410C',
} as const;

/** CSS-variable references, for inline styles that must stay theme-aware. */
export const HawkVar = {
  paper: 'var(--hawk-paper)',
  stock: 'var(--hawk-stock)',
  ground: 'var(--hawk-ground)',
  sunken: 'var(--hawk-sunken)',
  ink: 'var(--hawk-ink)',
  inkStrong: 'var(--hawk-ink-strong)',
  inkMuted: 'var(--hawk-ink-muted)',
  inkDisabled: 'var(--hawk-ink-disabled)',
  inkInverse: 'var(--hawk-ink-inverse)',
  line: 'var(--hawk-line)',
  lineStrong: 'var(--hawk-line-strong)',
  acc: 'var(--hawk-acc)',
  accSoft: 'var(--hawk-acc-soft)',
  credit: 'var(--hawk-credit)',
  debit: 'var(--hawk-debit)',
  reversal: 'var(--hawk-reversal)',
  hazard: 'var(--hawk-hazard)',
  danger: 'var(--hawk-danger)',
} as const;
