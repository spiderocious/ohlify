/**
 * Canonical motion tokens — React Native port.
 *
 * Source of truth: mobile/lib/ui/theme/app_motion.dart. Mirror these values
 * exactly so the RN app and Flutter app feel identical. The spring configs
 * match what's already proven in apps/mobile/src/main-tabs.navigation.tsx
 * (tab ripple + tab-switch transition) — reuse those, don't invent new ones.
 */
export const duration = {
  /** Press-state opacity/scale. */
  instant: 100,
  /** Toggle switches, chip selection, small state changes. */
  fast: 180,
  /** Screen-element entrances, modal open/close, tab switch. */
  base: 280,
  /** Full-screen transitions, success celebrations. */
  slow: 450,
} as const;

/** Animated.spring configs — RN's spring API takes speed/bounciness, not stiffness/damping. */
export const spring = {
  /** Button press-in, card select, toggle thumb. */
  snappy: { speed: 16, bounciness: 4 },
  /** Ripple reveals, success icon pop-in. */
  bouncy: { speed: 14, bounciness: 6 },
} as const;

/** List entrance stagger — per-item delay, capped item count so long lists don't feel slow. */
export const stagger = {
  perItemDelayMs: 35,
  maxStaggeredItems: 8,
} as const;
