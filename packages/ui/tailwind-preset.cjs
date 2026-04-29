/* eslint-disable */
/**
 * Tailwind preset for the Ohlify design system.
 *
 * Both customer-web and admin-web extend this preset so colors, fonts and
 * radii stay in sync with @ohlify/ui's theme tokens.
 *
 * The preset uses CSS variables (set in @ohlify/ui/styles.css) for colors so a
 * runtime palette swap is possible without a rebuild.
 */
const v = (name) => `var(--ohl-${name})`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Mona Sans Variable"',
          '"Mona Sans"',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
      },
      colors: {
        primary: { DEFAULT: v('primary'), hover: v('primary-hover') },
        secondary: v('secondary'),
        tertiary: v('tertiary'),
        post: v('post'),
        callico: v('callico'),
        danger: v('danger'),
        accent: v('accent'),

        background: v('background'),
        surface: {
          DEFAULT: v('surface'),
          light: v('surface-light'),
          dark: v('surface-dark'),
        },

        border: v('border'),
        error: v('error'),
        success: v('success'),
        warning: v('warning'),

        text: {
          primary: v('text-primary'),
          muted: v('text-muted'),
          'deep-blue': v('text-deep-blue'),
          silver: v('text-silver'),
          jet: v('text-jet'),
          slate: v('text-slate'),
          charcoal: v('text-charcoal'),
          forest: v('text-forest'),
          navy: v('text-navy'),
          amber: v('text-amber'),
          disabled: v('text-disabled'),
          white: v('text-white'),
          black: v('text-black'),
        },

        toast: {
          'success-bg': v('toast-success-bg'),
          'error-bg': v('toast-error-bg'),
          'warning-bg': v('toast-warning-bg'),
          'info-bg': v('toast-info-bg'),
          'success-icon': v('toast-success-icon'),
          'error-icon': v('toast-error-icon'),
          'warning-icon': v('toast-warning-icon'),
          'info-icon': v('toast-info-icon'),
        },

        nav: {
          background: v('nav-background'),
          'icon-inactive': v('nav-icon-inactive'),
        },
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        pill: '999px',
      },
    },
  },
};
