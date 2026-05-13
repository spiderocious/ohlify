import type { Config } from 'tailwindcss';

import preset from '../../packages/ui/tailwind-preset.cjs';

/**
 * Extends the `@ohlify/ui` preset (so the customer app's primitives stay
 * usable in the interactive demo) and layers an editorial palette on
 * top — `paper`, `ink`, `accent`, `highlight`. Marketing components
 * should reach for these over the product tokens.
 *
 * `content` MUST include the workspace `packages/ui` source tree —
 * otherwise classes used by reused components get purged in production.
 */
const config: Config = {
  presets: [preset as unknown as Config],
  content: [
    './app/**/*.{ts,tsx,mdx}',
    './src/**/*.{ts,tsx,mdx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: 'var(--ink)',
          soft: 'var(--ink-soft)',
        },
        paper: {
          DEFAULT: 'var(--paper)',
          elev: 'var(--paper-elev)',
          line: 'var(--paper-line)',
        },
        muted: 'var(--muted)',
        accent: 'var(--accent)',
        highlight: 'var(--highlight)',
      },
      fontFamily: {
        display: [
          '"Fraunces Variable"',
          '"Fraunces"',
          'ui-serif',
          'Georgia',
          'serif',
        ],
      },
    },
  },
  plugins: [],
};

export default config;
