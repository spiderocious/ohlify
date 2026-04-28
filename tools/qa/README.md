# tools/qa — QA harness for ohlify backend

Helpers used by the [.claude/agents/qa-runner.md](../../.claude/agents/qa-runner.md) agent and by humans running ad-hoc tests. Persisted on disk so each run inherits the toolbox instead of rebuilding from `/tmp`.

## What's here

| Script | Purpose |
|---|---|
| [`db.mjs`](db.mjs) | pg pool + query / queryOne helpers. CLI: `node tools/qa/db.mjs "SELECT …"` |
| [`redis.mjs`](redis.mjs) | ioredis client. CLI: `node tools/qa/redis.mjs keys 'rl:*'` / `get <k>` / `del <pattern>` |
| [`flush-all.mjs`](flush-all.mjs) | Wipe rate-limit + login + per-feature buckets. Does NOT touch active OTPs. |
| [`patch-otps.mjs`](patch-otps.mjs) | Set every active OTP (Redis + DB) to `123456` so verify steps succeed deterministically. |
| [`register-user.mjs`](register-user.mjs) | End-to-end registration. `node tools/qa/register-user.mjs <email> <phone> [pw]` → emits JSON with `{user_id, email, access_token, refresh_token}`. |
| [`regression-smoke.sh`](regression-smoke.sh) | One happy-path call per endpoint group. `bash tools/qa/regression-smoke.sh [features...]`. Exits non-zero on any failure. |
| [`sim-search.mjs`](sim-search.mjs) | Boundary search for `nameSimilarityPercent`. Finds inputs that score exactly N-1 / N / N+1 against a target. |
| [`set-fullname.mjs`](set-fullname.mjs) | Direct UPDATE on `users.full_name` for boundary tests. CLI: `<user_id> "<name>"`. |
| [`soft-delete-user.mjs`](soft-delete-user.mjs) | Toggle `users.deleted_at` for F-02 sweeps. CLI: `<user_id> delete\|restore`. |
| [`sign-paystack.mjs`](sign-paystack.mjs) | Compute HMAC-SHA512 signature for a Paystack webhook body using `PAYSTACK_WEBHOOK_SECRET`. CLI: `'<json-body>'` or stdin. Stdout = hex digest. |
| [`post-webhook.mjs`](post-webhook.mjs) | Build, sign, and POST a synthetic Paystack webhook. CLI: `charge.success\|charge.failed <reference> <amount_kobo> [<fees>] [<data_id>]` or `--raw '<json>'`. |
| [`reset-payments.mjs`](reset-payments.mjs) | Wipe payments + journals + wallet_entries + system balances for a user, for clean state between funding tests. **Bypasses append-only triggers via `session_replication_role` — dev DB only.** CLI: `<user_id>`. |
| [`inject-balanced-journal.mjs`](inject-balanced-journal.mjs) | Direct DB-level poster for arbitrary balanced multi-line journals. Relies on the deferred sum-to-zero trigger to catch mistakes. CLI: `'<json-of-{kind,idempotency_key,lines[],...}>'`. |
| [`inject-call-settlement.mjs`](inject-call-settlement.mjs) | Posts a `call_settlement` journal (`pending_debits_pool -gross, payee +(gross-fee), platform_revenue +fee`) so QA can drive the post-settle clawback refund branch without §8 (calls). CLI: `<payer_user_id> <payee_user_id> <gross_kobo> <fee_kobo> <call_id>`. |

## Conventions

- All scripts assume the local stack: `postgresql://feranmi@localhost:5432/ohlify`, `redis://localhost:6379`, server at `http://localhost:8080`.
- Override via `DATABASE_URL`, `REDIS_URL`, `OHLIFY_BASE_URL` env vars.
- ESM-only. Each script can be both imported (`import { redis } from './redis.mjs'`) and CLI-invoked.
- New script? Add it here AND a one-line entry in the table above.

## Idioms used in tests

```bash
# Register + login a user, capture token
TOKEN=$(node tools/qa/register-user.mjs qa@test.dev +2348011000999 | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Hit a protected endpoint
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/me

# After register/initiate or sensitive-action/otp, patch OTPs to known value
node tools/qa/patch-otps.mjs

# Wipe rate limits between bursts
node tools/qa/flush-all.mjs

# Direct DB query
node tools/qa/db.mjs "SELECT id, email, role FROM users ORDER BY created_at DESC LIMIT 5"

# Redis inspection
node tools/qa/redis.mjs keys 'bank-resolve:*'

# Threshold search for a custom resolved name
node tools/qa/sim-search.mjs "TEST ACCOUNT 1101011940" 45 2000
```

## Smoke users

`regression-smoke.sh` keeps two long-lived test users alive:

| Email | Phone | Role |
|---|---|---|
| `qa-smoke-pro@regression.dev` | `+2348011000111` | professional |
| `qa-smoke-client@regression.dev` | `+2348011000112` | client |

Both use `Password123!`. They are created on first smoke run and reused thereafter. Don't manually delete them.

## Test bank seed for `/banks/resolve`

Paystack's test mode allows unlimited resolves only on `bank_code = '001'` (`Paystack Test Bank`). Other codes are capped at 3 live resolves per day. The smoke script auto-skips the resolve check if `001` is not seeded.

To enable: `node tools/qa/db.mjs "INSERT INTO banks (code, name, is_active) VALUES ('001', 'Paystack Test Bank', TRUE) ON CONFLICT (code) DO UPDATE SET is_active = TRUE"`.

For non-prod environments, this should ideally land in a dev-only migration. Don't ship to prod.
