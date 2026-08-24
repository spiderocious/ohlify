import type { Config } from 'tailwindcss';

import preset from '../../packages/ui/tailwind-preset.cjs';
import hawkPreset from '../../packages/hawk-ui/hawk-preset.cjs';

const config: Config = {
  presets: [preset as unknown as Config, hawkPreset as unknown as Config],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
    '../../packages/hawk-ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
