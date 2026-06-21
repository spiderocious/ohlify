import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        danger: '#FF3B30',
        surface: '#1C1C1E',
      },
    },
  },
  plugins: [],
};

export default config;
