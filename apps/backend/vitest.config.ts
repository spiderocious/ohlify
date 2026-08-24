import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const src = (p: string) => fileURLToPath(new URL(`./src/${p}`, import.meta.url));

// Mirrors the `paths` block in tsconfig.json. Vitest resolves imports itself,
// so the two have to be kept in step — a new alias there needs one here.
export default defineConfig({
  resolve: {
    alias: [
      { find: /^@features\/(.*)\.js$/, replacement: `${src('features')}/$1.ts` },
      { find: /^@lib\/(.*)\.js$/, replacement: `${src('lib')}/$1.ts` },
      { find: /^@middlewares\/(.*)\.js$/, replacement: `${src('middlewares')}/$1.ts` },
      { find: /^@shared\/(.*)\.js$/, replacement: `${src('shared')}/$1.ts` },
      { find: /^@workers\/(.*)\.js$/, replacement: `${src('workers')}/$1.ts` },
    ],
  },
  test: {
    // Unit tests only. Integration/e2e have their own configs and need a DB.
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // `src/env.ts` validates the whole environment at import and throws on a
    // gap. A unit test that pulls in the logger — which most services do,
    // transitively — would otherwise fail on config it never uses. Loading the
    // real `.env` keeps tests honest about what the app actually needs rather
    // than stubbing a parallel set of values that can drift.
    setupFiles: [fileURLToPath(new URL('./src/test/env.setup.ts', import.meta.url))],
  },
});
