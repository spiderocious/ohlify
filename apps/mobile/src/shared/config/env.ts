/**
 * Runtime config, mirrors mobile/lib/shared/config/env.dart's Env class —
 * same var names, same required/optional split, same defaults. Values come
 * from `EXPO_PUBLIC_*`-prefixed vars in .env, Expo's standard mechanism for
 * inlining env vars into the Metro bundle (see .env.example) — no `extra`
 * wiring in app.config.ts needed.
 */
function readEnv(key: string): string | undefined {
  const value = process.env[`EXPO_PUBLIC_${key}`];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function requireEnv(key: string): string {
  const value = readEnv(key);
  if (!value) {
    throw new Error(`[Env] Missing required environment variable: EXPO_PUBLIC_${key}`);
  }
  return value;
}

export const Env = {
  apiBaseUrl: requireEnv('API_BASE_URL'),
  fileServiceUrl: requireEnv('FILE_SERVICE_URL'),
  appEnv: readEnv('APP_ENV') ?? 'development',
  useMocks: (readEnv('USE_MOCKS') ?? 'false') === 'true',
  paystackCallbackUrl:
    readEnv('PAYSTACK_CALLBACK_URL') ?? 'https://app.ohlify.com/payment/return',
  callAppUrl: readEnv('CALL_APP_URL') ?? 'http://localhost:5173',
} as const;
