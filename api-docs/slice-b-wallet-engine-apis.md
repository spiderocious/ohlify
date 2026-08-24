# Slice B — Wallet Engine APIs

This document covers the slice B additions to the wallet engine: wallet-first
payments, withdrawals, refunds, the admin write surface, and the new Paystack
transfer webhook handlers. Slice A (read paths, funding, reconciliation
read-only) is documented in `slice-a-wallet-engine-apis.md` and is unchanged.

All money fields use `JsonKobo` (`number | string`). Values within IEEE-754
safe range (under 2^53) are JSON numbers; larger values are strings. Clients
must accept both.

## Conventions

- Auth: `Authorization: Bearer <jwt>` for user routes; `X-Admin-Token: <stub>`
  for admin routes (stub gating, replaced in §21).
- Idempotency: `Idempotency-Key: <client-key>` header is honoured on
  `POST /wallet/withdraw` (and admin manual journal via the body field).
- Currency: NGN only.

## User-facing endpoints

### `POST /api/v1/wallet/pay` — wallet-first payment

Reserves funds from the user's wallet into `pending_debits_pool`. The journal
is the receipt — settlement happens later (in §8 when calls ship).

Request:

```json
{
  "amount_kobo": 300000,
  "purpose": "call_payment",
  "external_ref_id": "c_call_xxx",
  "metadata": { "professional_id": "u_pro_xxx" }
}
```

Response 200 (paid):

```json
{
  "status": "paid",
  "journal_id": "je_01jx...",
  "amount_kobo": 300000,
  "currency": "NGN",
  "purpose": "call_payment",
  "metadata": { "professional_id": "u_pro_xxx" },
  "paid_at": "2026-04-25T10:00:00.000Z"
}
```

Response 409 (insufficient — mobile redirects to fund flow then retries):

```json
{
  "ok": false,
  "data": {
    "status": "insufficient_balance",
    "short_by_kobo": 50000,
    "current_balance_kobo": 250000,
    "suggested_funding_amount_kobo": 100000,
    "currency": "NGN"
  },
  "error": { "code": "insufficient_balance", "message": "..." }
}
```

Idempotency: replays of the same `(purpose, external_ref_id)` collapse to
the original journal (`alreadyPosted=true` internally; client gets the same
response shape).

### `POST /api/v1/wallet/withdraw` — initiate a withdrawal

Validates daily/cooldown caps, balance, and saved bank account, then creates
a `withdrawals` row and posts the `withdrawal_requested` journal in one tx.
The Paystack transfer fires after commit; failure leaves the row pending so
ops can retry/force-fail.

Optional `Idempotency-Key` header — replays return the original row.

Request:

```json
{ "amount_kobo": 1500000 }
```

Response 201:

```json
{
  "id": "wd_01jx...",
  "status": "pending",
  "amount_kobo": 1500000,
  "currency": "NGN",
  "bank_name": "GTBank",
  "account_number_masked": "******7890",
  "failure_reason": null,
  "requested_at": "2026-04-25T10:00:00.000Z",
  "processed_at": null
}
```

Possible errors:

- `409 no_bank_account` — user must save a bank account first
- `409 insufficient_balance`
- `409 conflict` — caps exceeded (also possible 429 with `Retry-After`)
- `422 value_out_of_range` — below min, or above daily cap
- `502 upstream_unavailable` — Paystack recipient creation failed

### `GET /api/v1/wallet/withdrawals` — paginated list

Query: `cursor`, `limit` (1-50), `status?`. Returns the user's own
withdrawals.

### `GET /api/v1/wallet/withdrawals/:id` — single withdrawal (owner only)

### Refund requests (user-facing)

#### `POST /api/v1/refunds`

User opens a refund request against a journal connected to one of their
spends. Two valid target shapes:

1. **Pre-settle target** (typical): the journal directly debits the user's
   wallet — e.g. a `call_payment_reserve`. The user's wallet line on that
   journal must be a debit (negative `signed_amount_kobo`).
2. **Post-settle target**: the journal is a `call_settlement`. The user has
   no wallet line on the settlement itself (their reservation lived in
   `pending_debits_pool`), so the system cross-references the matching
   `call_payment_reserve` for the same `related_call_id` and confirms the
   requester was the original payer.

The actual refund posts on admin approval — pre-settle releases the pending
pool, post-settle claws back the payee + platform_revenue.

Request:

```json
{
  "target_journal_id": "je_01jx...",
  "reason_code": "service_not_delivered",
  "description": "Caller didn't show up"
}
```

Response 201 — `RefundRequestView` with `status: "pending"`.

Possible errors:

- `404 not_found / refund.invalid_target` — no debit journal owned by user
- `422 validation_error` — target is not a debit
- `409 conflict` — pending request already exists for this target

#### `GET /api/v1/refunds` — paginated

Query: `cursor`, `limit`, `status?`. Returns refund requests for the
authenticated user.

#### `GET /api/v1/refunds/:id` — single (owner only)

## Admin endpoints (`X-Admin-Token` gated)

All under `/api/v1/admin`.

### Write paths

| Method | Path | Purpose |
|---|---|---|
| POST | `/wallets/manual-journal` | Post arbitrary balanced lines |
| POST | `/wallets/credit` | `user_wallet +amount, platform_promo -amount` |
| POST | `/wallets/debit` | `suspense +amount, user_wallet -amount` |
| GET | `/refunds` | List all refund requests (filter by status) |
| POST | `/refunds/:id/approve` | Posts the actual refund journal, flips status |
| POST | `/refunds/:id/reject` | Closes the request without posting a journal |
| GET | `/withdrawals` | List all withdrawals (filter by status / user) |
| POST | `/withdrawals/:id/force-fail` | Reverse a stuck withdrawal |
| POST | `/wallets/replay-webhook` | Re-run business processing for a stored envelope |

#### Manual journal payload

```json
{
  "note": "Annual reconciliation correction",
  "lines": [
    { "account_id": "acct_xxx", "signed_amount_kobo": 50000 },
    { "account_id": "acct_yyy", "signed_amount_kobo": -50000 }
  ],
  "related_user_id": "u_xxx",
  "idempotency_key": "recon-2026-04"
}
```

The DB trigger enforces sum-to-zero at COMMIT — service-level `assertBalanced`
catches the same condition fast.

#### Refund approval logic

- If the target journal is `call_settlement` or `call_refund_post_settle`,
  the system posts a **post-settle clawback** (`refundPostSettle`): credits
  the payer, claws back the payee + platform_revenue at the *current*
  `platform_fee_bps` (read from `platform_config`).
- Otherwise (typical case — `call_payment_reserve`), the system posts a
  **pre-settle refund** (`refundReserve`): credits the payer and debits
  `pending_debits_pool`.

#### Force-fail withdrawal

Posts the `withdrawal_reversed` journal (returns funds to the user wallet)
and sets the row to `reversed`. Used when Paystack is silent and ops needs
to unstick the user's funds. Allowed transitions: `pending → reversed`,
`processing → reversed`. Already-terminal rows return 409.

## Paystack webhook additions

Existing handler now dispatches via `dispatchPaystackEvent`. Slice B adds:

- `transfer.success` → posts `withdrawal_completed` journal
  (`paystack_payouts -amount, paystack_clearing +amount` — clearing is a
  contra-asset that walks back toward zero on outflows) + flips status to
  `completed`
- `transfer.failed` → posts `withdrawal_reversed` journal + flips status to
  `failed`
- `transfer.reversed` → posts `withdrawal_reversed` journal + flips status to
  `reversed`

All three branches lookup the withdrawal by `transfer_code` first, falling
back to `reference` parsing (`wd_<id>`). Idempotency keys on the journals
keep replays safe.

## Outbox events (slice B emits)

| Event | Aggregate | Trigger |
|---|---|---|
| `call.payment.reserved` | payment | `POST /wallet/pay` success |
| `call.refunded` | call | refund approval (pre or post settle) |
| `withdrawal.requested` | withdrawal | `POST /wallet/withdraw` |
| `withdrawal.completed` | withdrawal | `transfer.success` webhook |
| `withdrawal.reversed` | withdrawal | `transfer.failed` / `.reversed` / force-fail |

The outbox worker now resolves the recipient user (via auth.repo) and enqueues
emails through the existing BullMQ `email` queue. Templates live in
`lib/notifications/templates/wallet-events.ts`.

## Configuration knobs

Read from `platform_config` (DB-backed, 5min in-process refresh):

- `wallet.platform_fee_bps` — applied at settlement and post-settle refund
- `wallet.min_withdrawal_kobo` (default 100_000)
- `wallet.max_withdrawal_per_day_kobo` (default 10_000_000)
- `wallet.max_withdrawals_per_day` (default 5)
- `wallet.withdrawal_cooldown_seconds` (default 60)
- `wallet.payout_mode` — `instant | daily_batch | manual_review`. Currently
  only `instant` and `manual_review` are wired in the request flow.

## Known limitations / followups

1. **Stub admin auth.** `X-Admin-Token` is a single shared secret. Replace
   in §21 with TOTP + per-admin audit-log writes.
2. **Per-admin audit log.** The `admin_audit_log` table doesn't exist yet —
   ships with §21. Until then admin actions are visible only via the
   `journal_entries.created_by_admin_id` column.
3. **Paystack OTP transfers.** `initiateTransfer` assumes OTP is disabled at
   the merchant level. If enabled in production, add the finalize step
   (`POST /transfer/finalize_transfer`) and a pending-OTP withdrawal status.
4. **Daily-batch payout mode.** `payout_mode === 'daily_batch'` falls through
   to the `instant` branch today. A scheduled batch worker that picks up
   `pending` withdrawals and fires transfers in groups is a §21 follow-up.
5. **Reconciliation drift response.** Worker logs ERROR but doesn't page —
   we'll wire PagerDuty in the observability slice.

---

## `GET /api/v1/wallet/transactions/:id` — one transaction's receipt

Auth required. Returns the same shape as a row from `GET /wallet/transactions`,
plus a `ledger` array.

Ownership is enforced **inside the query** (`accounts.owner_user_id = $1`), so
asking for an entry that belongs to someone else is indistinguishable from
asking for one that does not exist — both answer 404 `not_found`. A 403 that
differs from a 404 is an enumeration oracle.

### The ledger

```json
{
  "data": {
    "id": "we_…",
    "type": "call_payment",
    "amount_kobo": -3625000,
    "direction": "debit",
    "status": "completed",
    "occurred_at": "2026-08-16T14:02:00.000Z",
    "title": "Call payment",
    "reference": "OHL·7K2M4",
    "related_call_id": "ic_…",
    "ledger": [
      { "label": "Reserved in escrow",      "amount_kobo": 3750000, "occurred_at": "…" },
      { "label": "Settled to professional", "amount_kobo": 3081250, "occurred_at": "…" },
      { "label": "Platform fee",            "amount_kobo": 543750,  "occurred_at": "…" },
      { "label": "Returned to your wallet", "amount_kobo": 125000,  "occurred_at": "…" }
    ]
  }
}
```

**`ledger` is empty for anything that is not a call payment.** A top-up has no
escrow story, and a one-step "lifecycle" would be ceremony rather than
information — the client renders no timeline at all in that case.

It is reconstructed, not stored: every journal a call produces carries the same
`related_call_id`, so the reserve, the settlement, the platform's cut and any
returned remainder can be read back in order. Nothing needed backfilling.

The query deliberately reads the **platform's** view of those journals rather
than only the caller's own lines — a client who paid ₦37,500 needs to see the
split, and their own wallet only ever shows the debit and the refund. System
accounts have no `owner_user_id`, so no other user's identity is exposed.

Journal kinds with no human label are **dropped**, not shown raw: a timeline
row reading `platform_promo_grant` explains nothing and looks broken.

### Amounts

`amount_kobo` is `JsonKobo` — a JSON **number** while the value fits in a safe
integer, and a **string** once it does not. Clients must parse both; a bare
`as num` cast returns null on exactly the largest amounts.
