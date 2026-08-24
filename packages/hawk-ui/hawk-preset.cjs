/* eslint-disable */
/**
 * Tailwind preset for Hawk.
 *
 * Every colour resolves through a CSS variable declared in `src/styles.css`,
 * so a palette swap is a stylesheet edit and nothing rebuilds. Names are
 * prefixed `hawk-` throughout so this preset can be merged alongside the older
 * `@ohlify/ui` preset in one app without either shadowing the other.
 *
 * Consumers add both the preset and a content glob:
 *
 *   presets: [ohlifyPreset, hawkPreset],
 *   content: [..., '../../packages/hawk-ui/src/**\/*.{ts,tsx}'],
 */
const v = (name) => `var(--hawk-${name})`;

const SEMANTICS = ['neutral', 'info', 'success', 'caution', 'critical'];

/** Each semantic ships the mandatory quartet. CONTRACTS §1.1. */
const semanticColors = Object.fromEntries(
  SEMANTICS.map((s) => [
    s,
    {
      DEFAULT: v(`sem-${s}`),
      soft: v(`sem-${s}-soft`),
      'on-soft': v(`sem-${s}-on-soft`),
      border: v(`sem-${s}-border`),
    },
  ]),
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        hawk: [
          'Mona Sans Variable',
          'Mona Sans',
          'MonaSans',
          'Inter',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
      },

      colors: {
        hawk: {
          // Surfaces
          paper: v('paper'),
          stock: v('stock'),
          ground: v('ground'),
          sunken: v('sunken'),
          scrim: v('scrim'),
          canvas: { DEFAULT: v('app-canvas'), tint: v('app-canvas-tint') },
          'call-ground': v('call-ground'),
          hero: {
            DEFAULT: v('hero-violet'),
            on: v('hero-violet-on'),
            grid: v('hero-grid'),
            'grid-alt': v('hero-grid-alt'),
          },
          nav: { bg: v('nav-bg'), inactive: v('nav-inactive') },

          // The ink ladder
          ink: {
            DEFAULT: v('ink'),
            strong: v('ink-strong'),
            muted: v('ink-muted'),
            disabled: v('ink-disabled'),
            inverse: v('ink-inverse'),
            'inverse-muted': v('ink-inverse-muted'),
          },

          // Lines
          line: {
            DEFAULT: v('line'),
            strong: v('line-strong'),
            heavy: v('line-heavy'),
            perf: v('line-perf'),
          },

          // Accent
          acc: {
            DEFAULT: v('acc'),
            hover: v('acc-hover'),
            pressed: v('acc-pressed'),
            soft: v('acc-soft'),
            'soft-hover': v('acc-soft-hover'),
            'on-soft': v('acc-on-soft'),
            border: v('acc-border'),
            on: v('acc-on'),
          },

          // The five-value enum × quartet
          ...semanticColors,

          // Hazard — system alarm-state. Never a button. CONTRACTS §0.2.
          hazard: {
            DEFAULT: v('hazard'),
            soft: v('hazard-soft'),
            'on-soft': v('hazard-on-soft'),
            border: v('hazard-border'),
          },

          // Danger — irreversible, user-initiated. Colder than hazard.
          danger: {
            DEFAULT: v('danger'),
            hover: v('danger-hover'),
            soft: v('danger-soft'),
            'on-soft': v('danger-on-soft'),
            border: v('danger-border'),
          },

          // Money direction, strictly by sign.
          credit: v('credit'),
          debit: v('debit'),
          reversal: v('reversal'),

          // State ladder
          hovered: v('state-hover-tint'),
          pressed: v('state-pressed-tint'),
          selected: v('state-selected'),
        },
      },

      /* The register-aware radii resolve against whichever zone the element
         sits in — `rounded-hawk` is 16px in PASS and 8px in BOARD. */
      borderRadius: {
        hawk: v('rad'),
        'hawk-sm': v('rad-sm'),
        'hawk-xs': v('r-xs'),
        'hawk-fixed-sm': v('r-sm'),
        'hawk-fixed-md': v('r-md'),
        'hawk-fixed-lg': v('r-lg'),
        'hawk-fixed-xl': v('r-xl'),
        'hawk-pill': v('r-pill'),
      },

      spacing: {
        'hawk-0': v('s-0'),
        'hawk-1': v('s-1'),
        'hawk-2': v('s-2'),
        'hawk-3': v('s-3'),
        'hawk-4': v('s-4'),
        'hawk-5': v('s-5'),
        'hawk-6': v('s-6'),
        'hawk-7': v('s-7'),
        'hawk-8': v('s-8'),
        'hawk-9': v('s-9'),
        'hawk-10': v('s-10'),
        'hawk-11': v('s-11'),
        'hawk-12': v('s-12'),
        // Register-aware
        'hawk-pad': v('pad'),
        'hawk-pad-sm': v('pad-sm'),
        'hawk-gap': v('gap'),
        'hawk-row-y': v('row-y'),
      },

      height: {
        'hawk-sm': v('h-sm'),
        'hawk-md': v('h-md'),
        'hawk-lg': v('h-lg'),
      },
      minHeight: {
        'hawk-sm': v('h-sm'),
        'hawk-md': v('h-md'),
        'hawk-lg': v('h-lg'),
      },

      fontSize: {
        'hawk-display-xl': [v('t-display-xl'), { lineHeight: v('lh-tight') }],
        'hawk-display-lg': [v('t-display-lg'), { lineHeight: v('lh-tight') }],
        'hawk-display': [v('t-display'), { lineHeight: v('lh-tight') }],
        'hawk-title': [v('t-title'), { lineHeight: v('lh-snug') }],
        'hawk-header': [v('t-header'), { lineHeight: v('lh-snug') }],
        'hawk-body-title': [v('t-body-title'), { lineHeight: v('lh-snug') }],
        'hawk-medium': [v('t-medium'), { lineHeight: v('lh-snug') }],
        'hawk-subheader': [v('t-subheader'), { lineHeight: v('lh-normal') }],
        'hawk-body': [v('t-body'), { lineHeight: v('lh-normal') }],
        'hawk-label': [v('t-label'), { lineHeight: v('lh-normal') }],
        'hawk-caption': [v('t-caption'), { lineHeight: v('lh-normal') }],
        'hawk-overline': [v('t-overline'), { lineHeight: v('lh-normal') }],
        'hawk-tiny': [v('t-tiny'), { lineHeight: v('lh-normal') }],
      },

      letterSpacing: {
        'hawk-display': v('tr-display'),
        'hawk-tight': v('tr-tight'),
        'hawk-normal': v('tr-normal'),
        'hawk-label': v('tr-label'),
        'hawk-overline': v('tr-overline'),
      },

      boxShadow: {
        'hawk-popover': v('el-popover'),
        'hawk-modal': v('el-modal'),
        'hawk-toast': v('el-toast'),
        'hawk-press': v('el-press'),
        'hawk-focus': v('focus-ring'),
        'hawk-focus-danger': v('focus-ring-danger'),
      },

      zIndex: {
        'hawk-raised': '10',
        'hawk-sticky': '100',
        'hawk-header': '200',
        'hawk-drawer': '300',
        'hawk-scrim': '400',
        'hawk-modal': '500',
        'hawk-popover': '600',
        'hawk-toast': '700',
        'hawk-tooltip': '800',
        'hawk-critical': '900',
      },

      transitionTimingFunction: {
        'hawk-standard': v('e-standard'),
        'hawk-decelerate': v('e-decelerate'),
      },
      transitionDuration: {
        'hawk-instant': '100ms',
        'hawk-fast': '180ms',
        'hawk-base': '280ms',
        'hawk-slow': '450ms',
      },

      animation: {
        'hawk-scrim-in': 'hawk-scrim-in 200ms var(--hawk-e-standard) both',
        'hawk-content-in': 'hawk-content-in 280ms var(--hawk-e-standard) 40ms both',
        'hawk-sheet-up': 'hawk-sheet-up 280ms var(--hawk-e-standard) 40ms both',
        'hawk-sheet-right': 'hawk-sheet-right 280ms var(--hawk-e-standard) 40ms both',
        'hawk-toast-in': 'hawk-toast-in 180ms var(--hawk-e-standard) both',
        'hawk-shimmer': 'hawk-shimmer 1.4s linear infinite',
        'hawk-spin': 'hawk-spin 800ms linear infinite',
        'hawk-pulse': 'hawk-pulse 1.6s var(--hawk-e-standard) infinite',
        'hawk-ring': 'hawk-ring 1.8s var(--hawk-e-standard) infinite',
        'hawk-flip': 'hawk-flip 100ms var(--hawk-e-standard) both',
      },
    },
  },
};
