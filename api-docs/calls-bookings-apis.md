# Calls + Bookings + Strikes APIs

End-to-end booking + calling between a caller (consumer) and a callee (professional)
with Agora-powered audio/video, fee-mode-aware wallet flows, no-show / disconnect
handling, and a strikes-with-disputes system. All money is in kobo (NGN minor units).

Read [apps/test-area-web/docs/calls-architecture.html](../apps/test-area-web/docs/calls-architecture.html) for the architecture
walkthrough; this doc is the API reference.

## Auth + base path

- All user routes: `Authorization: Bearer <jwt>`. Base path `/api/v1`.
- All admin routes: `X-Admin-Token: <stub>`. Base path `/api/v1/admin`.
- Idempotency: `Idempotency-Key` header on `POST /bookings` (re-clicks return the original booking).

## Bookings

### `POST /api/v1/bookings`

Create + confirm a booking. Synchronously reserves wallet money (via the wallet
engine) and creates the matching `calls` row in `scheduled` status. Returns
both ids.

```json
{
  "callee_user_id": "u_pro_01jx...",
  "rate_id": "rate_01jx...",
  "start_at": "2026-05-01T15:00:00.000Z"
}
```

Response 201:

```json
{
  "id": "bk_01jx...",
  "status": "confirmed",
  "caller_user_id": "u_user_01jx...",
  "callee_user_id": "u_pro_01jx...",
  "rate_id": "rate_01jx...",
  "call_type": "video",
  "start_at": "2026-05-01T15:00:00.000Z",
  "duration_minutes": 30,
  "total_paid_kobo": 440000,
  "payee_amount_kobo": 400000,
  "platform_fee_kobo": 40000,
  "fee_mode_used": "add_to_payer",
  "call_id": "c_01jx...",
  "cancelled_at": null,
  "cancelled_by_user_id": null,
  "created_at": "2026-04-28T10:00:00.000Z"
}
```

`fee_mode_used` is **snapshotted at booking time** so a config flip mid-flight doesn't
retroactively re-split. The three amount fields always satisfy
`total_paid_kobo = payee_amount_kobo + platform_fee_kobo`.

Errors:
- `409 insufficient_balance` — wallet doesn't have enough; mobile redirects to fund flow.
- `409 professional_unavailable` — callee has an overlapping confirmed booking.
- `404 rate_not_found` — rate doesn't belong to that pro or is deleted.
- `422 validation_error` — start_at in the past, callee==caller, etc.

### `GET /api/v1/bookings`

Paginated list of the authenticated user's bookings (caller OR callee).

Query: `cursor`, `limit` (1-50), `status?`, `role=caller|callee?`.

### `GET /api/v1/bookings/:id`

Single booking. Visible to caller AND callee.

### `POST /api/v1/bookings/:id/cancel`

Cancel a confirmed booking. Refund + strike per architecture doc §6:

- Outside `bookings.cancel_window_minutes` → full refund (caller or callee, regardless).
- Inside window:
  - Caller cancels → keep `bookings.inside_window_penalty_bps` of total as platform_revenue, refund the rest.
  - Callee (pro) cancels → full refund + late-cancel strike (if config trigger on).

```json
{ "reason": "Optional, max 1000 chars" }
```

Errors:
- `404 booking_not_found` — not yours / doesn't exist.
- `409 conflict` — booking is past start_at (no-show resolver path) or already terminal.

## Calls

### `GET /api/v1/calls`

Paginated list. Query: `cursor`, `limit`, `status?`.

### `GET /api/v1/calls/:id`

```json
{
  "id": "c_01jx...",
  "booking_id": "bk_01jx...",
  "status": "scheduled",
  "agora_channel_name": "call_c_01jx...",
  "connected_seconds": 0,
  "caller_joined_at": null,
  "callee_joined_at": null,
  "caller_left_at": null,
  "callee_left_at": null,
  "ended_at": null,
  "settlement_journal_id": null,
  "refund_journal_id": null,
  "created_at": "2026-04-28T10:00:00.000Z"
}
```

### `POST /api/v1/calls/:id/join`

Issues an Agora RTC token scoped to (channel, uid, expires). Records the join
on the call row + emits a `caller_joined` / `callee_joined` event.

Response 200:

```json
{
  "call_id": "c_01jx...",
  "agora_app_id": "agora-app-id-here",
  "agora_channel_name": "call_c_01jx...",
  "agora_uid": 1234567890,
  "agora_token": "007eJxTYL...",
  "expires_at": "2026-04-28T11:00:00.000Z",
  "call_type": "video",
  "duration_minutes": 30,
  "remote_user_id": "u_pro_01jx...",
  "total_paid_kobo": 440000
}
```

Joinable while status is `scheduled | waiting_for_parties | in_progress`.
First join flips `scheduled → waiting_for_parties`. Both joined → `in_progress`.

Errors:
- `404 call_not_found` — not yours / doesn't exist.
- `409 call_not_joinable` — terminal status.

### `POST /api/v1/calls/:id/leave`

Records the leave. If both have left and call was `in_progress`, atomically
resolves the call (settlement + refund + outbox + strike). Idempotent: a
double-leave is a no-op.

Returns the (possibly updated) call view.

### `POST /api/v1/calls/:id/renew-token`

Re-issues a fresh Agora token without changing call state. Mobile calls this
~5 min before the existing token's `expires_at`.

## Strikes (professional-facing)

### `GET /api/v1/me/strikes`

Lists the authenticated pro's own strikes + a summary block. **Accessible
even when account is suspended** so a banned pro can dispute their way out.

Response:

```json
{
  "data": [ /* StrikeView[] */ ],
  "meta": {
    "next_cursor": null,
    "has_more": false,
    "summary": {
      "active_count": 1,
      "total_count": 1,
      "strikes_before_ban": 3,
      "remaining_before_ban": 2
    }
  }
}
```

`active_count` includes `active + upheld` (the ones counting toward the ban).
Disputed + voided don't count.

### `GET /api/v1/me/strikes/:id`

Single strike detail (owner only).

### `POST /api/v1/me/strikes/:id/dispute`

Pro disputes a strike. Must be in `active` status and within
`professional.strike_dispute_window_days` of issuance.

```json
{ "comment": "I had a power outage during the call, see attached..." }
```

Errors:
- `404 strike_not_found`
- `409 strike_not_disputable` — already disputed/upheld/voided.
- `409 strike_dispute_window_closed` — too late.

## Admin

### `POST /api/v1/admin/calls/test-init`

Bypass the booking flow. Skips slot conflict check, mints both Agora tokens,
returns join links. Wallet IS debited honestly (use admin-credit to fund the
test caller first).

```json
{
  "caller_user_id": "u_user_01jx...",
  "callee_user_id": "u_pro_01jx...",
  "rate_id": "rate_01jx...",   // optional; defaults to first active
  "start_in_seconds": 0         // optional; default 0
}
```

Response 201:

```json
{
  "booking_id": "bk_01jx...",
  "call_id": "c_01jx...",
  "agora_app_id": "...",
  "agora_channel_name": "call_c_01jx...",
  "call_type": "video",
  "duration_minutes": 30,
  "start_at": "2026-04-28T10:00:00.000Z",
  "total_paid_kobo": 440000,
  "caller": {
    "user_id": "u_user_01jx...",
    "agora_uid": 1234567890,
    "agora_token": "007e...",
    "expires_at": "2026-04-28T11:00:00.000Z"
  },
  "callee": {
    "user_id": "u_pro_01jx...",
    "agora_uid": 9876543210,
    "agora_token": "007e...",
    "expires_at": "2026-04-28T11:00:00.000Z"
  }
}
```

### `GET /api/v1/admin/calls`

Filterable: `status`, `user_id`, paginated.

### `POST /api/v1/admin/calls/:id/force-end`

Ops escape hatch. Resolves whatever state the call is in (no-show grace if pre-start; stuck_call if mid-call). Posts settlement + refund per the resolver logic. Used when Agora is silent and a call needs to be moved off `in_progress`.

### `GET /api/v1/admin/bookings`

Filterable: `status`, `user_id`.

### `GET /api/v1/admin/strikes`

Filterable: `status`, `professional_user_id`, `reason_code`.

### `POST /api/v1/admin/strikes/:id/uphold`

Body: `{ "comment": "Optional admin note" }`. Strike must be in `disputed`
status. After upholding, re-checks the auto-ban threshold (an upheld strike
that had been disputed may now push a pro over).

### `POST /api/v1/admin/strikes/:id/void`

Body: `{ "reason": "Required" }`. Voids an `active` or `disputed` strike. Final.

## Webhooks

### `POST /api/v1/webhooks/agora`

Public route gated by `Agora-Signature-V2` (HMAC-SHA256 of body using
`AGORA_WEBHOOK_SECRET`). When `AGORA_WEBHOOK_SECRET` is unset, signature
verification is skipped (dev only).

Acts on:
- `eventType=102` (channel_destroy) on a call that's `in_progress` or
  `waiting_for_parties` → resolves via `both_left` reason.

All events are recorded into `call_events` regardless of action.

Response 200 `{ "ok": true }` or 401 with reason.

## Configuration knobs (`platform_config`)

All admin-tunable. Defaults match architecture doc §8.

| Key | Default | Meaning |
|---|---|---|
| `wallet.fee_mode` | `deduct_from_payee` | A or B (see §3 of arch doc) |
| `wallet.platform_fee_bps` | 1500 | Fee in basis points |
| `wallet.min_billable_seconds` | 30 | Below this, treat as no-show |
| `wallet.caller_no_show_refund_pct_bps` | 2000 | Caller no-show: refund slice |
| `wallet.caller_no_show_payee_pct_bps` | 8000 | Caller no-show: pro slice (sums to 100% with above) |
| `bookings.no_show_grace_seconds` | 300 | After start_at, when to mark no-show |
| `bookings.cancel_window_minutes` | 60 | Outside this many min before start_at = "outside window" |
| `bookings.inside_window_penalty_bps` | 3000 | Caller inside-window cancel penalty |
| `bookings.network_flap_window_seconds` | 60 | Network drop/rejoin grace |
| `bookings.token_expires_seconds` | 3600 | RTC token TTL (1h) |
| `professional.strike_on_no_show` | true | Strike trigger toggle |
| `professional.strike_on_late_cancel` | true | Strike trigger toggle |
| `professional.strike_on_mid_call_quit` | true | Strike trigger toggle |
| `professional.strikes_before_ban` | 3 | Auto-ban threshold |
| `professional.strike_dispute_window_days` | 14 | Dispute window |

## Outbox events emitted

- `call.payment.reserved` — booking confirmed (caller pays, pro notified)
- `call.settled` — completed / disconnected calls (after journal)
- `call.refunded` — cancellations + no-shows (after journal)

Push notifications + in-app feed dispatch happens in §9 (notifications slice).
Today they go through the existing email branch.

## Background workers

Three new cron workers (in [apps/backend/src/workers/calls.worker.ts](../apps/backend/src/workers/calls.worker.ts)):

- **call-starter** — every 30s, flips `scheduled` → `waiting_for_parties` for calls past start_at.
- **no-show-resolver** — every 30s, resolves waiting calls past `start_at + grace`.
- **stuck-call-resolver** — every 60s, resolves in_progress calls past `start_at + duration + 5min buffer`.

All three use `SELECT ... FOR UPDATE SKIP LOCKED` so multi-instance safe.
