import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().default(8082),
  WORKER_PORT: z.coerce.number().default(8083),

  // Process role. Controls whether this Node process runs the HTTP server,
  // the background workers, or both. 'all' (default) preserves the original
  // single-process behavior. 'app' skips worker bootstrap entirely. 'worker'
  // skips the main HTTP server (a tiny /health listener still binds so
  // platform healthchecks pass). Per-worker WORKER_*_ENABLED flags continue
  // to apply on top — useful for disabling individual workers in 'worker'
  // mode.
  PROCESS_ROLE: z.enum(['all', 'app', 'worker']).default('all'),

  APP_BASE_URL: z.string(),
  WEB_BASE_URL: z.string(),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  PAYSTACK_SECRET_KEY: z.string().min(1),
  PAYSTACK_WEBHOOK_SECRET: z.string().min(1),

  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string(),

  // STUB: admin endpoints in this slice are gated by a single shared bearer-
  // style token. Replace with proper admin TOTP auth in §21 admin slice.
  // Production deployment must set this to a long random secret.
  // Tracked as a §21 follow-up — see middlewares/requireAdmin.middleware.ts.
  ADMIN_STUB_TOKEN: z.string().min(32),

  // Agora — RTC tokens are minted server-side using App ID + App Certificate.
  // App Certificate must NEVER ship to mobile. App ID is public.
  AGORA_APP_ID: z.string().min(1),
  AGORA_APP_CERTIFICATE: z.string().min(1),
  // Optional: Agora notification webhook secret. When set, the webhook
  // handler verifies HMAC; when unset, webhooks are accepted without
  // verification (dev only).
  AGORA_WEBHOOK_SECRET: z.string().optional(),

  // FCM (Firebase Cloud Messaging) for push notifications. Covers Android
  // + iOS — iOS uses FCM's APNs gateway so we don't need a separate APNs
  // setup. When unset, the push provider falls back to a no-op + warns
  // on each fan-out so calls still resolve cleanly without push.
  //
  // Set FCM_SERVICE_ACCOUNT_JSON to the base64-encoded service-account
  // JSON (avoid newline hell in env-var UIs like Railway).
  FCM_SERVICE_ACCOUNT_JSON_BASE64: z.string().optional(),
  FCM_PROJECT_ID: z.string().optional(),

  // Admin TOTP secret encryption key. 32-byte hex (= 64 hex chars). Generate
  // via `openssl rand -hex 32`. Required for the admin auth slice — secrets
  // are encrypted at rest in admin_users.totp_secret_encrypted.
  ADMIN_TOTP_ENCRYPTION_KEY: z.string().regex(/^[0-9a-f]{64}$/),

  // Admin JWT secrets — separate from user JWT secrets so admin tokens can't
  // be replayed against user routes and vice versa.
  ADMIN_JWT_ACCESS_SECRET: z.string().min(32),
  ADMIN_JWT_REFRESH_SECRET: z.string().min(32),
  ADMIN_JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  ADMIN_JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // One-shot bootstrap for the very first admin account. Endpoint is
  // POST /api/v1/admin/auth/bootstrap — unauthenticated, but gated three ways:
  //   1. ADMIN_BOOTSTRAP_ENABLED must be 'true' (this flag).
  //   2. admin_users table must be empty (idempotency by table state).
  //   3. After first call, the row exists, so #2 fails permanently.
  // After deploy + bootstrap, flip this to 'false' (or remove) and redeploy.
  // Default 'false' so production is safe-by-default.
  ADMIN_BOOTSTRAP_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  USE_DEFAULT_OTP: z.string().optional(),
  DEFAULT_OTP: z.string().optional(),

  // Worker toggles. Set any of these to 'false' to skip starting that worker
  // at boot — useful for running the API process without crons in dev, or for
  // splitting workers into a separate Railway service. Default (env var unset
  // or anything other than 'false') = enabled.
  WORKER_OUTBOX_ENABLED: z.string().optional(),
  WORKER_RECONCILIATION_ENABLED: z.string().optional(),
  WORKER_CALL_STARTER_ENABLED: z.string().optional(),
  WORKER_NO_SHOW_RESOLVER_ENABLED: z.string().optional(),
  WORKER_STUCK_CALL_RESOLVER_ENABLED: z.string().optional(),
  WORKER_EMAIL_ENABLED: z.string().optional(),

  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
});

export type Env = z.infer<typeof EnvSchema>;

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment variables:\n${issues}`);
}

export const env: Env = parsed.data;
