# Admin Reviews & Strikes — Handoff

**Status:** ✅ Shipped. All endpoints in [admin-reviews-strikes-apis.md](./admin-reviews-strikes-apis.md) are implemented. Typecheck + lint clean.

## What's new

**4 new endpoints (STAFF gate, audited):**
- `GET /api/v1/admin/reviews/:id` — detail + call context + audit trail
- `POST /api/v1/admin/reviews/:id/unhide` — reverses hide; audit action `reviews.unhide`
- `GET /api/v1/admin/strikes/:id` — detail + related call/booking + per-status strike history + audit trail
- `POST /api/v1/admin/strikes` — manual issuance; audit action `strikes.issue`, target indexed by `subject_user_id` (not strike id)

**Shape changes on existing endpoints:**
- `GET /admin/reviews` and `POST /admin/reviews/:id/hide` → `AdminReviewView` (adds `hidden_at`, `hidden_by_admin_id`, `hide_reason`, embeds `subject` user object)
- `GET /admin/strikes` → `AdminStrikeView` (embeds `subject: { id, name, avatar_url, role }` instead of bare `subject_user_id`)

## Decisions locked in code

1. **Void does NOT auto-unsuspend.** Active strike count drops, but `users.status='suspended'` is preserved. Admins reinstate explicitly via `/admin/users/:id/unsuspend`. Rationale and inline doc on `adminVoidStrike` in [strikes.service.ts](../apps/backend/src/features/strikes/strikes.service.ts).
2. **Manual strike reason↔role: strict pairing.** Pro-side reasons (`no_show`, `late_cancel`, `mid_call_quit`) require `subject_role='professional'`; caller-side reasons require `subject_role='caller'`. Mismatch → 400. Open follow-up: a generic `admin_other` reason valid for either role can be added if frontend needs it.
3. **Unhide flips `is_public = TRUE`.** Original user-chosen `is_public` is not preserved separately — schema doesn't track it.
4. **`review_aggregates` recompute on unhide is automatic.** Trigger on `INSERT OR UPDATE` already handles it; no manual recompute call needed.

## Reusable additions (worth knowing)

- [`auditRepo.trailFor(targetType, targetId)`](../apps/backend/src/features/admin/admin.audit.repo.ts) — fetches admin audit-trail entries joined with `admin_users.email`, with `note` extracted from request body's `reason` / `comment` / `description` field. Use this for any future admin detail endpoint that needs an embedded audit trail.
- New outbox events: `REVIEW_UNHIDDEN`, `STRIKE_ISSUED_BY_ADMIN`. Default no-op in the worker — wire downstream notification handlers when needed.

## Open follow-ups (not blocking ship)

- Add `admin_other` strike reason if manual issuance hits cases that don't fit the existing 5 codes.
- Consider an "auto-unsuspend on full void" admin convenience action (deliberate, not automatic on void).
- `auditAdmin` middleware writes after `res.finish` and is fire-and-forget. If we ever need transactional audit (write or fail), revisit.
