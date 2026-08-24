import { fileURLToPath } from 'node:url';
import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@app', replacement: path.resolve(__dirname, 'src') },
      { find: '@features', replacement: path.resolve(__dirname, 'src/features') },
      { find: '@shared', replacement: path.resolve(__dirname, 'src/shared') },
      {
        find: /^@ohlify\/hawk-ui$/,
        replacement: path.resolve(__dirname, '../../packages/hawk-ui/src/index.ts'),
      },
      {
        find: /^@ohlify\/ui$/,
        replacement: path.resolve(__dirname, '../../packages/ui/src/index.ts'),
      },
      {
        find: /^@ohlify\/core$/,
        replacement: path.resolve(__dirname, '../../packages/core/src/index.ts'),
      },
      {
        find: /^@ohlify\/api$/,
        replacement: path.resolve(__dirname, '../../packages/api/src/index.ts'),
      },
      {
        find: /^@icons$/,
        replacement: path.resolve(__dirname, '../../packages/ui/src/icons/index.ts'),
      },
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
