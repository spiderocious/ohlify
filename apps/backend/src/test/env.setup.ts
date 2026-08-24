import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Loads `.env` before any test module imports `src/env.ts`.
 *
 * `env.ts` validates the whole environment at import time and throws on a gap.
 * Almost every service reaches it transitively through the logger, so a unit
 * test that never touches S3 or Agora would still fail on their absence.
 *
 * The real `.env` is used rather than a fixture on purpose: a parallel set of
 * test values drifts from what the app actually requires, and the first sign
 * is a green suite against a config that cannot boot.
 *
 * Nothing here overrides a value already in the environment, so CI can supply
 * its own without this file fighting it.
 */
const envPath = fileURLToPath(new URL('../../.env', import.meta.url));

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    // Values may be quoted; strip one matching pair.
    const value = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^(['"])(.*)\1$/, '$2');
    process.env[key] ??= value;
  }
}
