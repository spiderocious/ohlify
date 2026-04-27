# Slice A — Wallet Engine + Legal + Support + Platform Config

> Bundle 7, Slice A. Read **Common conventions** in `onboarding-apis.md` once before reading this doc.

**Base URL:** `https://api.ohlify.com` (prod) · `http://localhost:8080` (local)
**Version prefix:** `/api/v1`

> ⚠️ **Stub admin auth.** All `/admin/*` endpoints in this slice are gated by a single shared bearer-style token in the `X-Admin-Token` header. **Production hardening required before launch** — replace with the §21 admin slice (TOTP-backed, per-admin audit trails). See `middlewares/requireAdmin.middleware.ts`.

> ⚠️ **`/wallet/stats.total_calls` is hardcoded to 0** until §8 (calls) ships. Visible smoking gun in every wallet stats response.

---

## Endpoint index

### Public (unauthenticated)
| # | Method | Path | Purpose |
|---|---|---|---|
| 1 | GET | `/api/v1/config/public` | Cold-start config snapshot for mobile/web |
| 2 | POST | `/api/v1/webhooks/paystack` | Paystack webhook intake (HMAC-gated) |

### Authed user (Bearer + active user)
| # | Method | Path | Purpose |
|---|---|---|---|
| 3 | GET | `/api/v1/legal/eula` | Latest EULA |
| 4 | GET | `/api/v1/legal/privacy` | Latest privacy policy |
| 5 | GET | `/api/v1/legal/terms` | Latest terms |
| 6 | GET | `/api/v1/help/faqs` | Published FAQs |
| 7 | GET | `/api/v1/help/contact` | Support contact channels |
| 8 | POST | `/api/v1/help/tickets` | Submit a support ticket |
| 9 | GET | `/api/v1/wallet` | User's wallet summary |
| 10 | GET | `/api/v1/wallet/stats` | Period stats (this_week / this_month / total_calls) |
| 11 | GET | `/api/v1/wallet/transactions` | Cursor-paginated transaction history |
| 12 | POST | `/api/v1/wallet/fund/initialize` | Start a Paystack funding charge |
| 13 | POST | `/api/v1/wallet/fund/verify` | Polling fallback for funding completion |
| 14 | GET | `/api/v1/payments/:reference` | Payment status by internal reference |

### Admin (X-Admin-Token gated — read-only in slice A)
| # | Method | Path | Purpose |
|---|---|---|---|
| 15 | GET | `/api/v1/admin/wallets/users/:userId` | View any user's wallet + recent journals |
| 16 | GET | `/api/v1/admin/wallets/accounts` | List system + user accounts with balances |
| 17 | GET | `/api/v1/admin/wallets/accounts/:code` | View a system account by stable code |
| 18 | GET | `/api/v1/admin/wallets/journals` | Cursor-paginated journal list (filterable) |
| 19 | GET | `/api/v1/admin/wallets/journals/:id` | Full journal detail with all lines |
| 20 | GET | `/api/v1/admin/wallets/reconciliation/run` | On-demand reconciliation report |
| 21 | GET | `/api/v1/admin/wallets/paystack-webhooks` | Webhook envelope list (forensics) |
| 22 | GET | `/api/v1/admin/wallets/paystack-fees-summary` | Sum of paystack_fees account in window |
| 23 | GET | `/api/v1/admin/wallets/platform-revenue-summary` | Sum of platform_revenue account in window |

**Total: 23 endpoints.**

---

## Account model

The wallet engine is **double-entry bookkeeping**. Three account flavors:

- **`user`** — one per user, `owner_user_id` set, `system_code` NULL. The user's money.
- **`system`** — singletons identified by `system_code`. Platform-owned accounts (clearing, revenue, promo, suspense, pending pool).
- **`liability`** — same shape as system; tracks money owed to outside parties (paystack_fees, paystack_payouts).

Every money movement is a **journal** with N≥2 lines that **must sum to zero**. Lines are append-only (`UPDATE`/`DELETE` rejected by trigger). Idempotency is enforced at the journal level (`journal_entries.idempotency_key UNIQUE`).

**System accounts seeded in slice A:**

| `system_code` | Kind | Purpose |
|---|---|---|
| `paystack_clearing` | system | Money received from Paystack but not yet allocated |
| `paystack_fees` | liability | Tracking how much Paystack has charged us in fees |
| `paystack_payouts` | liability | Outgoing transfers awaiting Paystack confirmation (slice B uses) |
| `platform_revenue` | system | Platform's earned fees (our cut of completed calls — slice B) |
| `platform_promo` | system | Promotional credits issued to users (admin) |
| `suspense` | system | Unallocated funds awaiting admin review |
| `pending_debits_pool` | system | Reserved-but-not-yet-spent money for pending call payments (slice B) |

---

## Reference flows (slice A only)

### Wallet funding journal
```
Journal: wallet_funding   idempotency_key: funding:<reference>
  user_wallet(u_caller):  +net_kobo
  paystack_fees:          +fee_kobo            (when fee > 0)
  paystack_clearing:      -gross_kobo
```

`gross = net + fee`. Replay (Paystack re-delivery, polling verify after webhook) hits the unique idempotency key and is a no-op.

Other journal kinds (`call_payment_reserve`, `call_settlement`, `call_refund`, `withdrawal_*`, `admin_*`) are defined in the schema and `lib/wallet/accounting.ts` reference comments but **only `wallet_funding` is exercised in slice A**. Slice B activates the rest.

---

## Public endpoints

### 1. `GET /api/v1/config/public`

Cold-start config snapshot. Mobile fetches once before auth restore.

**Auth:** none.

**Per-IP rate limit:** 60 / 60s.

**Response — 200**
```json
{
  "data": {
    "values": {
      "auth.otp_resend_seconds": 60,
      "auth.otp_ttl_seconds": 600,
      "rates.allowed_durations_minutes": [5, 10, 15, 20, 25, 30, 45, 60],
      "rates.min_kobo": 50000,
      "rates.max_kobo": 50000000,
      "support.email": "support@ohlify.com",
      "support.whatsapp_number": "+2348000000000",
      "support.whatsapp_deeplink": "https://wa.me/2348000000000",
      "wallet.min_funding_kobo": 50000,
      "wallet.max_funding_kobo": 100000000,
      "wallet.max_withdrawal_per_day_kobo": 10000000,
      "features.public_web_booking": true
    },
    "fetched_at": "2026-04-27T..."
  }
}
```

Only `platform_config` rows with `is_public = TRUE` are exposed. Headers: `Cache-Control: public, max-age=300, s-maxage=300`.

### 2. `POST /api/v1/webhooks/paystack`

Paystack webhook intake. Public route — gated by HMAC-SHA512 signature in the `x-paystack-signature` header.

**CRITICAL:** body is consumed as raw bytes. The route mounts its own `express.raw({ type: 'application/json' })` and the global `express.json()` middleware skips this path. Sending a parsed JSON body via `Content-Type: application/json` works because the raw middleware reads bytes regardless.

**Headers**
- `x-paystack-signature` — required. HMAC-SHA512 of the raw body using `PAYSTACK_WEBHOOK_SECRET`.

**Behavior**
1. Verifies HMAC. Returns 401 `unauthorized` on mismatch.
2. Parses JSON. Returns 400 `validation_error` on malformed JSON or missing event type.
3. Attempts to insert a `paystack_webhooks` row keyed by `data.id` (or `data.reference` fallback). Conflict → no-op (already processed). Returns 200.
4. Inside the same tx, dispatches by `event`:
   - `charge.success` → locks payment, marks success, posts `wallet_funding` journal.
   - `charge.failed` → marks payment failed.
   - All other event types → recorded for forensics, no business processing.
5. Any handler exception rolls back EVERYTHING (envelope insert, payment update, journal lines). Paystack retries on non-2xx.

**Responses**
- `200` — accepted (including duplicates).
- `401 unauthorized` — bad/missing signature.
- `400 validation_error` — non-buffer body, malformed JSON, or missing `event` field.
- `500 internal` — handler exception (Paystack will retry).

**Replay safety:** journal idempotency keys are derived from the **payment reference**, not the webhook event_id. So even if Paystack changes the event_id between deliveries, the journal still dedupes.

---

## Authed user endpoints

### 3-5. `GET /legal/{eula|privacy|terms}`

Returns the latest published version of the named legal doc.

**Auth:** Bearer + active user.

**Response — 200**
```json
{
  "data": {
    "kind": "eula",
    "version": "1.0",
    "blocks": [
      { "type": "title", "content": "End-User License Agreement" },
      { "type": "subtitle", "content": "Version 1.0 — placeholder" },
      { "type": "body", "content": "..." },
      { "type": "heading", "content": "Acceptable use" },
      { "type": "body", "content": "..." }
    ],
    "content_markdown": null,
    "published_at": "2026-04-27T..."
  }
}
```

`blocks[]` follows the **ContentBlock** primitive (POJO const enum at `src/shared/types/content-block.ts`). UI iterates and renders per `type`. `content_markdown` is the legacy/escape-hatch field — ignore when `blocks[]` is non-empty.

**Headers**
- `Cache-Control: public, max-age=86400`
- `ETag: W/"legal-{kind}-<sha256-prefix>"` — derived from `(version, published_at)`.
- 304 on `If-None-Match` match.

**Errors**
| Status | code | When |
|---|---|---|
| 401 | unauthorized / token_invalid | Auth |
| 404 | not_found | No published version of this kind |
| 429 | rate_limited | Global limit |

### 6. `GET /help/faqs`

**Auth:** Bearer + active user.

**Response — 200**
```json
{
  "data": [
    { "id": "faq_01", "question": "How do I get paid?", "answer": "...", "blocks": [] },
    { "id": "faq_02", "question": "When does a call become billable?", "answer": "...", "blocks": [] }
  ]
}
```

Sorted by `sort_order ASC, created_at ASC`. ETag derived from `MD5(string_agg(id || updated_at))`. 304 on If-None-Match. `Cache-Control: public, max-age=3600`.

### 7. `GET /help/contact`

**Auth:** Bearer + active user.

**Response — 200**
```json
{
  "data": {
    "support_email": "support@ohlify.com",
    "whatsapp_number": "+2348000000000",
    "whatsapp_deeplink": "https://wa.me/2348000000000"
  }
}
```

Reads from `platform_config` keys `support.email`, `support.whatsapp_number`, `support.whatsapp_deeplink`. `Cache-Control: public, max-age=3600`.

### 8. `POST /help/tickets`

**Auth:** Bearer + active user. Per-user rate limit: 10 / 1h.

**Request**
```json
{
  "subject": "string, 2-200 chars",
  "message": "string, 2-10000 chars",
  "attachments": ["file_keys/from-uploads-microservice"]
}
```

`attachments` is an optional array (max 10) of file_keys. Backend stores them verbatim; doesn't fetch or validate their existence (uploads is a separate microservice).

**Response — 201**
```json
{
  "data": {
    "ticket_id": "tk_01j...",
    "status": "open",
    "created_at": "2026-04-27T..."
  }
}
```

**Errors**
| Status | code | When |
|---|---|---|
| 400 | validation_error | Bad body shape |
| 401 | unauthorized / token_invalid | Auth |
| 429 | rate_limited | 10/h limit |

### 9. `GET /wallet`

User's wallet summary.

**Auth:** Bearer + active user.

**Response — 200**
```json
{
  "data": {
    "balance_kobo": 56089400,
    "pending_balance_kobo": 0,
    "withdrawable_balance_kobo": 56089400,
    "currency": "NGN"
  }
}
```

- `balance_kobo` is the SUM of all `wallet_entries.signed_amount_kobo` for this user's wallet account.
- `pending_balance_kobo` is the user's portion of `pending_debits_pool` (positive when they have reserved-but-not-settled call payments).
- `withdrawable_balance_kobo` equals `balance_kobo` in slice A (the reserve flow already subtracts the pending amount from the wallet, so available = withdrawable). The field is surfaced separately for client clarity.
- New users: a wallet account is materialized just-in-time on first access. New users see `0`.

### 10. `GET /wallet/stats`

**Auth:** Bearer + active user.

**Response — 200**
```json
{
  "data": {
    "this_week_kobo": 0,
    "this_month_kobo": 0,
    "total_calls": 0
  }
}
```

⚠️ **`total_calls` is hardcoded to 0** until §8 ships. `this_week_kobo` and `this_month_kobo` are the SUM of signed amounts on the user's wallet account, windowed by `date_trunc('week'/'month', now())`.

### 11. `GET /wallet/transactions`

Cursor-paginated user transaction list.

**Auth:** Bearer + active user.

**Query**
| Param | Type | Default | Notes |
|---|---|---|---|
| `cursor` | string | — | Opaque, base64url |
| `limit` | int | 20 | 1-50 |

**Response — 200**
```json
{
  "data": [
    {
      "id": "we_01j...",
      "journal_id": "je_01j...",
      "reference": "ohf_ref_01j...",
      "type": "wallet_funding",
      "amount_kobo": 500000,
      "currency": "NGN",
      "status": "completed",
      "occurred_at": "2026-04-27T...",
      "description": "Wallet funding",
      "related_call_id": null,
      "related_payment_id": "pay_01j...",
      "related_withdrawal_id": null
    }
  ],
  "meta": { "next_cursor": "...", "has_more": false }
}
```

**Notes**
- `amount_kobo` is **signed**. Positive = credit to user's wallet, negative = debit. Client uses sign to render `+₦500.00` vs `-₦300.00`.
- `type` strings are stable derivations from journal kind: `wallet_funding`, `call_payment`, `call_earning`, `call_refund`, `withdrawal`, `withdrawal_completed`, `withdrawal_reversed`, `admin_credit`, `admin_debit`, `admin_manual`, `promo_credit`.
- `reference` is **our internal reference** (surfaced to users). Paystack's reference is stored in `payments.paystack_reference` but never exposed.
- Slice A: every visible row has `status = 'completed'`. Withdrawal in-flight states arrive in slice B.

### 12. `POST /wallet/fund/initialize`

Initiates a Paystack charge to fund the user's wallet.

**Auth:** Bearer + active user. Per-user rate limit: 10 / 1h.

**Request**
```json
{
  "amount_kobo": 500000,
  "callback_url": "https://app.ohlify.com/wallet/funded?ref=..."   // optional
}
```

`amount_kobo` must be in `[wallet.min_funding_kobo, wallet.max_funding_kobo]` (default 50_000 ↔ 100_000_000).

**Response — 201**
```json
{
  "data": {
    "reference": "ohf_ref_01j...",
    "paystack_reference": "psk_01j...",
    "amount_kobo": 500000,
    "currency": "NGN",
    "authorization_url": "https://checkout.paystack.com/...",
    "access_code": "..."
  }
}
```

The mobile/web client opens `authorization_url` (in-app webview or Paystack SDK). On completion, the Paystack webhook lands the funds; the client can poll `/wallet/fund/verify` for immediate confirmation.

**Errors**
| Status | code | When |
|---|---|---|
| 422 | value_out_of_range | amount below min or above max |
| 401 | token_invalid | User not found |
| 502 | upstream_unavailable | Paystack 5xx / timeout. Includes `Retry-After: 5`. |

### 13. `POST /wallet/fund/verify`

Polling fallback for funding completion. Webhook is the source of truth — this endpoint just asks "did the webhook land?" and, if not, hits Paystack `/transaction/verify` directly.

**Auth:** Bearer + active user. Per-user rate limit: 60 / 10min.

**Request**
```json
{ "reference": "ohf_ref_01j..." }
```

**Response — 200**
```json
{
  "data": {
    "status": "success",
    "amount_kobo": 500000,
    "currency": "NGN",
    "reference": "ohf_ref_01j..."
  }
}
```

`status ∈ "success" | "pending" | "failed"`.

**Behavior**
- Already terminal locally (success/failed) → returns current state without hitting Paystack.
- Pending locally → calls Paystack. If still pending/abandoned, returns `pending`. If terminal, applies the same idempotent flow as the webhook — locks the payment, marks status, posts the funding journal.

**Errors**
| Status | code | When |
|---|---|---|
| 404 | not_found | Reference unknown OR doesn't belong to this user |
| 502 | upstream_unavailable | Paystack 5xx / timeout |

### 14. `GET /payments/:reference`

Payment status by our internal reference.

**Auth:** Bearer + active user.

**Response — 200**
```json
{
  "data": {
    "id": "pay_01j...",
    "reference": "ohf_ref_01j...",
    "purpose": "wallet_funding",
    "status": "success",
    "amount_kobo": 500000,
    "currency": "NGN",
    "channel": "card",
    "paid_at": "2026-04-27T...",
    "call_id": null,
    "created_at": "2026-04-27T..."
  }
}
```

`status ∈ "pending" | "success" | "failed" | "refunded" | "partially_refunded"`. Owner-only — 404 if reference belongs to another user.

---

## Admin endpoints (stub-token gated)

> All require `X-Admin-Token: <env.ADMIN_STUB_TOKEN>`. Token comparison via `crypto.timingSafeEqual`. ⚠️ Replace with real admin auth in §21.

### 15. `GET /admin/wallets/users/:userId`

Per-user wallet detail + recent journals (last 25).

**Response — 200**
```json
{
  "data": {
    "user_id": "u_...",
    "account_id": "acct_...",
    "available_kobo": 500000,
    "pending_kobo": 0,
    "withdrawable_kobo": 500000,
    "currency": "NGN",
    "recent_journals": [
      {
        "id": "je_...",
        "kind": "wallet_funding",
        "idempotency_key": "funding:ohf_ref_...",
        "related_call_id": null,
        "related_payment_id": "pay_...",
        "related_withdrawal_id": null,
        "related_user_id": "u_...",
        "memo": "Wallet funding ref=ohf_ref_...",
        "created_by_admin_id": null,
        "created_at": "2026-04-27T..."
      }
    ]
  }
}
```

404 if the user has no wallet account materialized yet.

### 16. `GET /admin/wallets/accounts`

**Query:** `?kind=user|system|liability|all` (default `all`).

**Response — 200**
```json
{
  "data": [
    {
      "id": "acct_sys_paystack_clearing",
      "kind": "system",
      "owner_user_id": null,
      "system_code": "paystack_clearing",
      "currency": "NGN",
      "label": "Paystack incoming-funds clearing account",
      "balance_kobo": 0,
      "is_active": true
    }
    // …
  ]
}
```

### 17. `GET /admin/wallets/accounts/:code`

Resolves a system account by its stable code (e.g. `paystack_fees`, `platform_revenue`). 404 if code unknown.

### 18. `GET /admin/wallets/journals`

Cursor-paginated journal list.

**Query**
| Param | Notes |
|---|---|
| `cursor`, `limit` | Standard cursor (1-50, default 20) |
| `kind` | Filter to one journal kind (e.g. `wallet_funding`) |
| `user_id` | Filter to journals where `related_user_id = $userId` |
| `call_id` | Filter to journals tied to a specific call |

**Response — 200**
```json
{
  "data": [ /* journal summaries — same shape as recent_journals above */ ],
  "meta": { "next_cursor": "...", "has_more": true }
}
```

### 19. `GET /admin/wallets/journals/:id`

Full journal detail with all wallet_entries lines.

**Response — 200**
```json
{
  "data": {
    "id": "je_...",
    "kind": "wallet_funding",
    "idempotency_key": "funding:ohf_ref_...",
    "related_user_id": "u_...",
    "related_payment_id": "pay_...",
    "memo": "...",
    "created_at": "2026-04-27T...",
    "lines": [
      { "id": "we_...", "account_id": "acct_user_...", "account_label": "User wallet", "signed_amount_kobo": 490000, "currency": "NGN" },
      { "id": "we_...", "account_id": "acct_sys_paystack_fees", "account_label": "Paystack fee tracking account", "signed_amount_kobo": 10000, "currency": "NGN" },
      { "id": "we_...", "account_id": "acct_sys_paystack_clearing", "account_label": "Paystack incoming-funds clearing account", "signed_amount_kobo": -500000, "currency": "NGN" }
    ]
  }
}
```

Lines sum to zero by invariant.

### 20. `GET /admin/wallets/reconciliation/run`

Compares cached `account_balances.balance_kobo` against the SUM of `wallet_entries.signed_amount_kobo` per account. Returns drift rows.

**Response — 200**
```json
{
  "data": {
    "ran_at": "2026-04-27T...",
    "ok": true,
    "drift": []
  }
}
```

When `ok = false`, `drift[]` lists every account with a mismatch:
```json
{
  "account_id": "...",
  "account_label": "...",
  "cached_balance_kobo": 100000,
  "ledger_sum_kobo": 99500,
  "drift_kobo": -500
}
```

`drift_kobo = ledger_sum - cached`. Should always be zero on a correct system. Any drift = bug.

### 21. `GET /admin/wallets/paystack-webhooks`

Webhook envelope log for forensic replay/inspection.

**Query:** `?limit=N` (default 50, max 200).

**Response — 200**
```json
{
  "data": [
    {
      "id": "pwh_...",
      "event_id": "paystack:1234567",
      "event_type": "charge.success",
      "received_at": "2026-04-27T...",
      "processed_at": "2026-04-27T...",
      "processing_error": null,
      "replay_count": 0
    }
  ]
}
```

Replay endpoint (`POST /admin/wallets/paystack-webhooks/:id/replay`) ships in slice B with admin write paths.

### 22. `GET /admin/wallets/paystack-fees-summary`

Sum of `paystack_fees` account in a date window.

**Query:** `?from=YYYY-MM-DD&to=YYYY-MM-DD` (both optional).

**Response — 200**
```json
{
  "data": {
    "account_id": "acct_sys_paystack_fees",
    "total_kobo": 0,
    "currency": "NGN",
    "from": null,
    "to": null
  }
}
```

### 23. `GET /admin/wallets/platform-revenue-summary`

Same shape as 22 but for `platform_revenue`. Slice A always returns 0 (no call settlement journals fire until slice B).

---

## Errors reference (slice A additions)

| Code | HTTP | Meaning |
|---|---|---|
| `value_out_of_range` | 422 | Funding amount out of `min/max_funding_kobo` |
| `upstream_unavailable` | 502 | Paystack 5xx / timeout. Includes `Retry-After: 5` |
| `unauthorized` | 401 | Webhook HMAC mismatch OR missing X-Admin-Token |
| `token_invalid` | 401 | User soft-deleted or gone |
| `not_found` | 404 | Reference unknown / not the caller's resource |

---

## What's NOT in slice A (lands in slice B)

- `POST /wallet/pay` (smart-pay flow)
- `POST /wallet/withdraw`
- `POST /wallet/refund-requests` (user-facing refund request)
- `GET /wallet/refund-requests` / `:id`
- All admin write endpoints (manual journal, credit, debit, place/release/settle pending debit, refund-request approve/reject, force-fail withdrawal, replay webhook)
- Wallet reconciliation cron worker
- Refund as a feature (see Q3 — its own feature folder)
- Call settlement / refund flows (depend on §8)
- Withdrawal Paystack Transfer flow

---

## Files of interest (for QA grep)

| Concern | Path |
|---|---|
| Account model | `src/lib/wallet/accounts.ts` |
| Journal post helper | `src/lib/wallet/journal.ts` |
| Sign-convention reference doc | `src/lib/wallet/accounting.ts` |
| Balance reader | `src/lib/wallet/balance.ts` |
| Funding flow | `src/lib/wallet/flows/funding.ts` |
| Outbox | `src/lib/outbox/*` + `src/workers/outbox.worker.ts` |
| Paystack client | `src/lib/paystack/client.ts` |
| Paystack signature verifier | `src/lib/paystack/webhook-verify.ts` |
| Stub admin middleware | `src/middlewares/requireAdmin.middleware.ts` |
| Platform-config reader | `src/lib/config/platform-config.service.ts` |
| ContentBlock primitive | `src/shared/types/content-block.ts` |
| Bigint JSON serializer | `src/lib/response.ts` (`normalizeBigints`) |
| Append-only triggers | migration `0030_wallet_triggers.ts` |
| Sum-to-zero deferred trigger | migration `0030_wallet_triggers.ts` |
| Payment status transition trigger | migration `0035_payment_status_transition_trigger.ts` |
