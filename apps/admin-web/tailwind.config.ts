import type { Config } from 'tailwindcss';

import preset from '../../packages/ui/tailwind-preset.cjs';

const config: Config = {
  presets: [preset as unknown as Config],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
