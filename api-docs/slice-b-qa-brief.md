# Slice B — QA Brief

This brief lists the test surfaces introduced by slice B of the wallet engine.
Use it to design integration tests, drive manual QA, or run an exploratory
ledger session against staging Paystack.

The double-entry invariants from slice A still apply: every journal sums to
zero, append-only enforced at the trigger layer, and account balances are
maintained by the AFTER INSERT trigger under per-account advisory lock. None
of those guarantees are weakened in slice B.

## New endpoints (user)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/wallet/pay` | bearer | Returns 200 paid OR 409 insufficient |
| POST | `/wallet/withdraw` | bearer | Idempotency-Key supported |
| GET | `/wallet/withdrawals` | bearer | Paginated by `requested_at desc` |
| GET | `/wallet/withdrawals/:id` | bearer | Owner only |
| POST | `/refunds` | bearer | One-pending-per-target gate |
| GET | `/refunds` | bearer | Owner-scoped list |
| GET | `/refunds/:id` | bearer | Owner only |

## New endpoints (admin, `X-Admin-Token`)

- `POST /admin/wallets/manual-journal`
- `POST /admin/wallets/credit`
- `POST /admin/wallets/debit`
- `GET /admin/refunds`
- `POST /admin/refunds/:id/approve`
- `POST /admin/refunds/:id/reject`
- `GET /admin/withdrawals`
- `POST /admin/withdrawals/:id/force-fail`
- `POST /admin/wallets/replay-webhook`

## Test scenarios — happy path

1. **End-to-end call payment (pre-settle refund branch)**
   - Fund wallet to ₦5,000 via existing `/wallet/fund/initialize` → simulated
     `charge.success` webhook.
   - `POST /wallet/pay { amount_kobo: 300_000, purpose: "call_payment", external_ref_id: "c_test_1" }`
   - Inspect `pending_debits_pool` and the user wallet — pool +300k, wallet -300k.
   - `POST /refunds { target_journal_id: "<je from /wallet/pay>", reason_code: "test" }`
   - Admin: `POST /admin/refunds/<rfd>/approve` → wallet should restore to
     pre-pay balance, pool returns to 0.

2. **Withdrawal happy path (instant mode)**
   - Save bank account via `/profile/bank-account`.
   - `POST /wallet/withdraw { amount_kobo: 200_000 }` with `Idempotency-Key: wd-1`.
   - Expect status `processing` after Paystack initiation succeeds.
   - Simulate `transfer.success` webhook (use `/admin/wallets/replay-webhook`
     against a recorded event_id) → status `completed`, processed_at populated.

3. **Idempotent withdrawal replay**
   - Repeat the same `POST /wallet/withdraw` with the same `Idempotency-Key`.
   - Expect identical row returned, *no* second journal posted.

4. **Wallet pay idempotency**
   - Repeat the same `POST /wallet/pay` with same `external_ref_id`.
   - Reserve journal returns `alreadyPosted=true`; ledger is unchanged.

## Test scenarios — failure modes

5. **Insufficient balance redirect**
   - With wallet at 0, `POST /wallet/pay { amount_kobo: 100_000, ... }`.
   - Expect 409 with `data.status === 'insufficient_balance'`,
     `short_by_kobo: 100000`,
     `suggested_funding_amount_kobo: 150000` (₦500 buffer).

6. **Withdrawal cap enforcement**
   - Set platform_config `wallet.max_withdrawals_per_day` to 2.
   - Issue 2 successful withdrawals.
   - Third withdrawal returns 429 `rate_limited`.

7. **Withdrawal cooldown**
   - Configure cooldown 120s.
   - Two withdrawals within 30s — second returns 429 with `Retry-After`.

8. **Force-fail stuck withdrawal**
   - Boot a withdrawal in `pending` (skip Paystack call by setting
     `payout_mode='manual_review'`).
   - `POST /admin/withdrawals/<id>/force-fail { reason: "stuck" }`.
   - Expect status `reversed`, user wallet credited back the full amount.

9. **Webhook replay safety**
   - Replay a `transfer.success` envelope twice via `/admin/wallets/replay-webhook`.
   - Withdrawal stays `completed`; `withdrawal_completed` journal exists once.
   - `paystack_webhooks.replay_count` increments.

10. **Refund — only debits allowed**
    - Try opening a refund against an `admin_credit` journal.
    - Expect 422 `validation_error / target_journal_id` rejecting the credit.

11. **Refund — one-pending-per-target**
    - Open a refund. Try opening a second refund against the same journal.
    - Expect 409 `conflict / refund.conflict`.

12. **Post-settle clawback**
    - Manually post a `call_settlement` journal via the manual-journal endpoint
      (or wait for §8). Approve a refund whose target is that settlement journal.
    - Expect a `call_refund_post_settle` journal with three lines: payer +amount,
      payee -(amount-fee), platform_revenue -fee. Fee uses *current*
      `platform_fee_bps`.

## Test scenarios — invariants

13. **Reconciliation worker**
    - Boot the server and wait 30s + the configured interval.
    - Expect `wallet reconciliation OK` log line. Drift should be 0.
    - Manually corrupt a balance row (`UPDATE account_balances SET
      balance_kobo = balance_kobo + 1000 WHERE account_id = '<id>'`).
    - Next tick should ERROR with the drift detail.

14. **Append-only enforcement**
    - `UPDATE wallet_entries SET signed_amount_kobo = ... WHERE id = '...'`
      should fail with the trigger error message.
    - Same for DELETE.

15. **Sum-to-zero enforcement**
    - Manual journal with intentionally unbalanced lines should be rejected
      at COMMIT (or earlier by `assertBalanced`).

16. **Paystack transfer outage handling**
    - Toggle the Paystack mock to return 5xx for `/transfer`.
    - `POST /wallet/withdraw` succeeds at the DB layer (row + journal posted)
      and returns 201 with status `pending`. The transfer is left for retry.

## Outbox + email checks

17. **Email enqueue**
    - Inspect Redis BullMQ `email` queue after each happy-path test.
    - Expect: 1 job per `wallet.funding.succeeded`, `call.payment.reserved`,
      `call.refunded`, `withdrawal.requested`, `withdrawal.completed`,
      `withdrawal.reversed` event, addressed to the right user.
    - Subjects come from `templates/wallet-events.ts`.

18. **Outbox retry**
    - Block the outbox worker by killing Redis briefly.
    - Verify rows accumulate in `outbox` (published_at NULL).
    - Restore Redis. Workers should drain at next tick.

## Tooling notes

- `pnpm nx run backend:typecheck` — must pass.
- `pnpm nx run backend:lint` — must pass.
- For ledger spelunking, query
  `SELECT je.kind, je.idempotency_key, sum(we.signed_amount_kobo) AS net
   FROM journal_entries je JOIN wallet_entries we ON we.journal_id = je.id
   GROUP BY je.id ORDER BY je.created_at DESC LIMIT 50;`
  — every row should net to 0.

## Known limitations to call out in QA

1. Stub admin token — every admin action is attributed to `adm_stub`.
2. No call settlement endpoint yet (§8); to test `call_settlement` journals,
   post manually via `/admin/wallets/manual-journal`.
3. Paystack OTP-protected transfers are not handled.
4. `daily_batch` payout mode falls through to `instant`.
5. Reconciliation drift logs ERROR but doesn't page.
