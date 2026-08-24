# Admin dashboards — API

Two composed read endpoints, one per board. Both are GET, both read-only, both
behind `requireAdmin` + `requireAdminRole`.

**Why composed rather than one endpoint per section:** each page draws every
section at once. Nine requests would add nine chances for one to fail and leave
the board half-rendered, and sections fetched separately across a bucket
boundary would disagree with each other. Each handler runs its queries
concurrently against one shared window.

---

## `GET /api/v1/admin/dashboard`

The business board.

| | |
|---|---|
| **Auth** | `requireAdmin` → `requireAdminRole(ANY_ADMIN)` — admin, support, finance_ops |
| **Query** | `range` — `today` \| `7d` \| `30d` \| `90d`. Defaults to `7d`. |
| **Errors** | `400 validation_error` on an unknown range (Zod `.strict()`); `401` unauthenticated |

### Why a named range and not `from`/`to`

Both boards compare a period against the one immediately before it, and that
comparison is only meaningful when the two windows are the same length.
Accepting arbitrary dates would let a caller ask for a three-day window
compared against ninety, and every delta badge would quietly lie.

### Response

`{ data: { range, granularity, window, attention, money, calls, growth, platform, trust, generated_at } }`

Full field-by-field types: `packages/api/src/admin/dashboard-types.ts`.

**Money is role-gated in the service, not the client.** `money` is `null` for
any role outside `admin` / `finance_ops`, and those queries do not run at all
for such a caller. A client-side omission would still leave the figures in the
response for anyone reading the network tab. (Fixes BUGS.md B12, where the
revenue panel 403'd for support.)

### Conventions this response follows

- **Deltas are `number | null`.** Null means the previous period was empty, so
  no percentage can honestly be drawn from a zero base — it does not mean
  "unchanged". Clients render no badge.
- **Ages are seconds, never pre-formatted.** A board left open would otherwise
  freeze its own clock at whatever the server said on load.
- **`answer_rate_delta` is percentage POINTS**, not a relative change.
- **Money is kobo as a JSON number**, per `ResponseUtil`'s bigint handling.
- **Empty buckets are present with `value: 0`.** `generate_series` gap-fills, so
  a quiet Sunday does not vanish from the x-axis and make Saturday look adjacent
  to Monday.

### Notable derivations

| Field | Source |
|---|---|
| `attention.uncredited_payments` | `paystack_webhooks WHERE processed_at IS NULL` — stated as its consequence, since an unprocessed `charge.success` is a user who paid and was never credited |
| `attention.suspense` | `account_balances` for `system_code = 'suspense'`. Non-zero is always a bug |
| `money.escrow_kobo` | The `minutes_escrow` **balance**, not a movement — held money is a level, not a flow |
| `money.ledger` | `wallet_entries` sum vs cached `account_balances`, per account. Zero by construction |
| `calls.answer_rate` | `ended / (ended + missed)` on `instant_calls` |
| `calls.funnel` | `call_status` — stages are scheduled → reached start → both joined → completed. **Not** booked → paid: a `calls` row only exists once payment settled, so there is no unpaid stage to drop out of |
| `calls.quality` | `call_session_events`, written directly by the mobile client. `permission_blocked` counts `ca:permission-needed`; `ended_without_signal` counts streams with no terminating `ca:ended` |
| `growth.activation` | Timestamp columns already on `users` — no new schema |
| `growth.supply.bookable` | Approved AND available AND holding a non-deleted rate. A professional with no rate never appears in search |
| `platform.*` | `auth_sessions.platform / app_version / os_version / device_model`, sent by the Flutter client on sign-in, registration and push-token registration |

Medians use `PERCENTILE_CONT` rather than `AVG`: one four-hour outlier drags an
average somewhere no real call ever sat.

---

## `GET /api/v1/admin/dashboard/technical`

The infrastructure board.

| | |
|---|---|
| **Auth** | `requireAdmin` → `requireAdminRole(ADMIN_ONLY)` — reports process internals, dead letters and auth failures |
| **Query** | Same `range`. Most of the payload ignores it (see below) |
| **Errors** | `403 forbidden` for support / finance_ops; `400`; `401` |

Most figures are live probes rather than windowed aggregates — queue depth,
pool saturation and ledger drift are facts about *now*, and averaging them over
ninety days would hide every spike that mattered. Only webhooks-by-type, auth
outcomes, idempotency and call streams take the window.

### Response

`{ data: { range, window, health, outbox, integrations, api, realtime, integrity, config, call_streams, generated_at } }`

### Notable derivations

| Field | Source |
|---|---|
| `health.dependencies` | Timed `SELECT 1` and `PING`. Over 250ms reports `degraded` — slow-but-answering is its own state, and the one that pages you at 3am |
| `health.pool.waiting` | `pg` Pool. Non-zero is the earliest warning of DB saturation there is |
| `health.redis.*` | Redis `INFO`. **Every field nullable** — a managed Redis may restrict sections, and "unknown" is not "zero" |
| `health.process.migration_version` | `pgmigrations` — which migration the running code sits on |
| `outbox.oldest_lag_seconds` | **The health metric, not depth.** 2,000 rows draining in ten seconds is fine; three stuck for an hour is an unnoticed outage |
| `outbox.dead_lettered` | `last_error LIKE 'permanent:%'` — the worker stamps that prefix once `attempt_count` hits its ceiling of 8, so the DLQ is exact rather than inferred |
| `integrations.agora.signature_verification_enabled` | Whether `AGORA_WEBHOOK_SECRET` is set. Unset means every delivery is accepted unverified, and nothing else would reveal it |
| `api.auth.*` | `auth_events` (migration `0103`) |
| `realtime.connections` | **Per process.** The SSE registry is an in-memory map; Redis only decides which process hears an event |
| `config.version_gates[].sessions_below` | Live sessions a forced upgrade would lock out. Compared on zero-padded dotted segments so `1.10.0` sorts above `1.9.0` |
| `call_streams.missing_client_end` | Calls the server closed with no client `ca:ended`. **The disagreement between the two logs is the finding** |

### Deliberately absent

- **Per-request latency and error rates.** `requestLog` middleware emits method,
  path, status and duration to pino, never to a table. An invented p95 is worse
  than no p95. A log drain or a `request_metrics` table would close this.
- **Worker cron heartbeats.** The loops in `calls.worker.ts` and the
  reconciliation worker do not persist a last-run, so "is the cron alive?" is
  unanswerable. A `worker_runs` table or a Redis heartbeat key would close it.
- **BullMQ queue depths.** Reading them needs a live queue connection from the
  request path; the outbox is fully measured and carries the real backlog risk.

---

## `auth_events` (migration `0103`)

One row per authentication attempt, successful or not.

`auth_sessions` records sessions, so it only ever saw successes — a rejected
password created no session and landed nowhere, making "how many logins failed
last night?" unanswerable. This is an append-only log rather than a counter:
a count gives a number, the log gives which addresses, which reason codes and
which app versions, which is what makes it actionable. It is also the substrate
lockout and abuse detection need.

```
id, event, outcome, reason, user_id, subject, ip, user_agent,
platform, app_version, created_at
```

- `event` ∈ `login, register, otp_verify, password_reset, refresh, logout`
- `outcome` ∈ `success, failure`; a failure without a `reason` is rejected by a CHECK
- `subject` is an identifier — a user id, email or phone. **Never a credential**
- UPDATE and DELETE are rejected by trigger, matching `wallet_entries` and
  `call_events`: an audit trail that can be edited is not an audit trail

---

# Admin users — API

## `GET /api/v1/admin/users`

| | |
|---|---|
| **Auth** | `requireAdmin` → `requireAdminRole(STAFF)` |
| **Query** | `q`, `role`, `status`, `kyc_status`, `cursor`, `limit` |

**`q` now matches phone numbers** as well as email, handle and full name. A
support ticket carries whichever identifier the user gave, and phone was the
one the old query could not match.

Each row carries four aggregates so an operator can triage a page without
opening every account:

| Field | Source |
|---|---|
| `rating` / `review_count` | `review_aggregates`. **Null rating** means never rated — not zero stars |
| `wallet_kobo` | `account_balances` for the user's own account. **Null when the caller may not see money** |
| `calls_total` | `instant_calls`, either side |
| `active_strikes` | `strikes WHERE status = 'active'` |

`meta.counts` returns unfiltered `{all, active, suspended, blocked}` for the
status tabs. Deliberately **not** narrowed by the caller's search: a tab whose
count moves as you type can no longer say how many suspended accounts exist,
which is the only thing it is there for.

---

## `GET /api/v1/admin/users/:id`

Every field the previous response carried is still returned — `kyc_submission`,
`bank_account`, `wallet`, `recent_calls_as_caller`/`_callee`, `recent_devices`,
`flags`. Widening a response is safe; reshaping one breaks whatever was reading
it. Fifteen blocks were added alongside:

| Block | Source |
|---|---|
| `vitals` | Wallet, lifetime earned/spent, escrow, call counts, rating, active strikes |
| `profile` | `users` columns the list omits — cover photo, selfie key, interests, categories, availability, `handle_changed_at` |
| `kyc_extra` | Submission count and per-item rejection keys |
| `calls` | `instant_calls`, either side, counterparty resolved to a name |
| `reviews` | Reviews **about** this user, hidden ones included — a hidden review is still evidence |
| `strikes` · `reports` | `strikes`; `reports` in **both directions** (filed and received) |
| `sessions` · `auth_events` · `devices` | The security trail |
| `notification_prefs` | Why a notification may not have arrived. Defaults all-on when no row exists |
| `tickets` · `chat` | Support history; chat as **volume only**, never contents |
| `admin_actions` | `admin_audit_log WHERE target_id = user` |
| `money` | Rates, wallet entries, withdrawals, minutes held. **Null for non-money roles** |

Recent lists are capped at 12 — deep history belongs on the dedicated feature
screens, and this endpoint stays a single round of parallel index lookups.

### Money is gated in three places, not one

`money: null` alone would have been a fig leaf while the balance sat one key
away in `vitals`. For any role outside `admin` / `finance_ops`:

- `money` is `null` and its four queries never run
- `vitals.wallet_kobo`, `lifetime_earned_kobo`, `lifetime_spent_kobo` and
  `escrow_kobo` are `null`
- the list's `wallet_kobo` is `null` per row

Non-money vitals (calls, rating, strikes) stay — support needs those to work.
The client renders a dash for a withheld value rather than ₦0: "withheld" and
"empty" are different facts.

### `balance_after_kobo` is derived

The ledger stores movements, not balances, so the running balance is walked
**backwards** from the current one. That is the only direction that is correct
without reading every entry the account ever had.
