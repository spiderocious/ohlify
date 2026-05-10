# Admin — Reviews Moderation & Strikes APIs

**Audience:** backend team. **Status:** ✅ shipped — all endpoints listed below are now implemented. Frontend can integrate.

This doc lists every endpoint the admin web app needs for reviews moderation and strikes. Each entry says whether it **EXISTS** today (✅) or is **NEEDED** (❌). The ❌ items are the actual handover work; the ✅ items are documented here so backend can sanity-check the contracts before frontend wires them up.

All routes are mounted under `/api/v1` and require:
- `requireAdmin` (admin session — JWT or stub `X-Admin-Token`)
- `requireAdminRole(['admin', 'support'])` — STAFF tier (moderation, not money)

All write actions are wrapped with `auditAdmin(...)` — they auto-write a row to `admin_audit_log` on 2xx response. The ❌ new endpoints below MUST follow the same pattern.

Standard response envelope: `{ success: true, data, meta? }` for ok, `{ success: false, error: { code, message, details? } }` for failures.

---

## Reviews Moderation

### ✅ `GET /api/v1/admin/reviews` — list reviews

Now returns `AdminReviewView` (extends previous shape with `hidden_at`, `hidden_by_admin_id`, `hide_reason`, and an embedded `subject` user object).

Query params (all optional):

| Param | Type | Notes |
|---|---|---|
| `cursor` | string | opaque, base64url, returned in `meta.next_cursor` |
| `limit` | int 1–50 | default 20 |
| `rating_max` | int 1–5 | only show reviews with rating ≤ N (e.g. `rating_max=2` for low-star queue) |
| `flagged` | `'true'\|'false'` | reserved for future user-report flagging — currently a no-op filter |
| `user_id` | string | reviews authored by this user |
| `professional_id` | string | reviews about this professional |
| `only_hidden` | `'true'\|'false'` | filter by `hidden_at IS NOT NULL` |

Response `data`: array of `AdminReviewView`:
```ts
{
  id: string,
  call_id: string,
  rating: 1|2|3|4|5,
  feedback_text: string | null,
  is_public: boolean,
  reviewer: { id, name, avatar_url },
  subject: { id, name, avatar_url },         // the professional/callee being reviewed
  hidden_at: string | null,                   // ISO ts; null = visible
  hidden_by_admin_id: string | null,
  hide_reason: string | null,
  created_at: string                          // ISO
}
```
Response `meta`: `{ next_cursor: string | null }`

> Confirm with backend: today's `ReviewView` (`reviews.types.ts`) does not include `hidden_at / hidden_by_admin_id / hide_reason` — admin list MUST include them so the UI can render the moderation state. If the admin variant doesn't already include these, please extend it.

### ✅ `GET /api/v1/admin/reviews/:id` — single review detail

Why we need it: deep-link from audit log entries, share-a-review-with-teammate URLs, review-context drawer.

Response `data`: same `AdminReviewView` shape as above, plus:
```ts
{
  ...AdminReviewView,
  call: {
    id: string,
    call_type: 'audio' | 'video',
    duration_minutes: number,
    connected_seconds: number,
    scheduled_at: string,
    status: string
  },
  audit_trail: Array<{                        // recent admin actions on this review
    id: string,
    action: string,                           // 'reviews.hide' | 'reviews.unhide' | ...
    admin_id: string,
    admin_email: string,
    note: string | null,
    created_at: string
  }>
}
```

### ✅ `POST /api/v1/admin/reviews/:id/hide` — hide a review

Now returns the full updated `AdminReviewView` (previously returned a stripped subset).

Body:
```ts
{ reason: string }   // 1..2000 chars, required
```
Response `data`: updated `AdminReviewView` (with `hidden_at`, `hidden_by_admin_id`, `hide_reason` populated).

Side effects (verify these are wired): hiding MUST trigger recompute of the affected pro's `review_aggregates` row so their public rating reflects the moderation. Today the trigger fires on insert/update/delete; confirm a `hidden_at` change is treated as an update that recomputes (excluding hidden rows).

### ✅ `POST /api/v1/admin/reviews/:id/unhide` — restore a hidden review

Note: unhide flips `is_public` back to TRUE. The original user-chosen `is_public` value is not preserved separately — restore = visible. The `review_aggregates` recompute trigger fires on UPDATE so the pro's public rating is updated automatically.

Why: today hiding is a one-way action. Mistaken hides should be reversible.

Body:
```ts
{ reason: string }   // 1..2000 chars, required — why we're restoring
```
Response `data`: updated `AdminReviewView` (with `hidden_at = null`, `hidden_by_admin_id = null`, `hide_reason = null`).

Audit action: `'reviews.unhide'`, `targetType: 'review'`.

Side effects: same as hide — must recompute the pro's `review_aggregates`.

---

## Strikes Moderation

### ✅ `GET /api/v1/admin/strikes` — list strikes

Now returns `AdminStrikeView` with embedded `subject: { id, name, avatar_url, role }` (replaces the bare `subject_user_id` previously returned).

Query params (all optional):

| Param | Type | Notes |
|---|---|---|
| `cursor` | string | opaque base64url |
| `limit` | int 1–50 | default 20 |
| `status` | `'active'\|'disputed'\|'upheld'\|'voided'` | |
| `subject_user_id` | string | strikes against this user |
| `subject_role` | `'professional'\|'caller'` | which role the user was acting in |
| `reason_code` | enum (see below) | |

`reason_code` values:
- Pro-side: `no_show`, `late_cancel`, `mid_call_quit`
- Caller-side: `caller_no_show`, `caller_disconnect`

Response `data`: array of `AdminStrikeView`:
```ts
{
  id: string,
  subject: { id, name, avatar_url, role: 'professional' | 'caller' },
  related_call_id: string | null,
  related_booking_id: string | null,
  reason_code: StrikeReason,
  description: string | null,            // system-generated description from call resolver
  status: 'active' | 'disputed' | 'upheld' | 'voided',
  dispute_comment: string | null,        // user's dispute text, null if not disputed
  disputed_at: string | null,
  admin_review_comment: string | null,   // admin's note when uphold/void
  reviewed_by_admin_id: string | null,
  reviewed_at: string | null,
  created_at: string
}
```
Response `meta`: `{ next_cursor: string | null }`

> Confirm: today's `StrikeView` does not include `subject` user object (just `subject_user_id`). Admin queue is unusable without seeing who the strike is against — please join the user row and return name + avatar.

### ✅ `GET /api/v1/admin/strikes/:id` — single strike detail

Why: deep links from audit log + queue → drawer/page transition.

Response `data`:
```ts
{
  ...AdminStrikeView,
  related_call: { id, call_type, scheduled_at, status, connected_seconds } | null,
  related_booking: { id, status, created_at } | null,
  subject_strike_history: {              // context: how many strikes does this user already have?
    total_count: number,
    active_count: number,
    upheld_count: number,
    voided_count: number,
    strikes_before_ban: number
  },
  audit_trail: Array<{ id, action, admin_id, admin_email, note, created_at }>
}
```

### ✅ `POST /api/v1/admin/strikes/:id/uphold` — uphold a disputed strike

Body:
```ts
{ comment?: string }   // 0..2000 chars, optional
```
Status precondition: strike MUST be in `disputed` status (uphold is only meaningful as the resolution of a dispute).

Response `data`: updated `AdminStrikeView` (status `upheld`, `admin_review_comment`, `reviewed_by_admin_id`, `reviewed_at` populated).

### ✅ `POST /api/v1/admin/strikes/:id/void` — void a strike

Body:
```ts
{ reason: string }   // 1..2000 chars, required
```
Status precondition: strike MUST be in `active` or `disputed` status (cannot void already-voided or already-upheld strikes).

Response `data`: updated `AdminStrikeView` (status `voided`, fields populated).

**Decision (locked):** Voiding does NOT auto-unsuspend. The active strike count drops (status → 'voided' is excluded from the counting set) but the user's `status='suspended'` is preserved. Admins must explicitly call `/admin/users/:id/unsuspend` to reinstate. Rationale: suspension may rest on context outside this single strike (open reports, payment chargebacks, prior pattern), so coupling void → unsuspend produces surprising flips. Documented inline in `strikes.service.ts:adminVoidStrike`.

### ✅ `POST /api/v1/admin/strikes` — manually issue a strike

Why: today strikes are only created by the call-resolution engine. Admin needs the ability to issue a strike for off-platform misconduct (e.g. abusive support ticket, payment fraud, etc.) flagged via reports.

Body:
```ts
{
  subject_user_id: string,                // required
  subject_role: 'professional' | 'caller', // required
  reason_code: StrikeReason,              // required, must be one of the 5 enum values
  description: string,                    // required, 1..2000 chars — why admin issued this
  related_call_id?: string,               // optional
  related_booking_id?: string,            // optional
  related_report_id?: string              // optional, link back to a /admin/reports row
}
```
Response `data`: the new `AdminStrikeView` (status `active`, `created_at` set, no dispute fields).

Audit action: `'strikes.issue'`. Implementation choice: `targetType` is `'user'` and `targetId` is the `subject_user_id` (not the strike id) — the audit row indexes by the affected user so user-history views pick it up. The created strike id is in the response and the audit metadata.

**Validation:** `reason_code` must match `subject_role`'s side. Pro-side reasons (`no_show`, `late_cancel`, `mid_call_quit`) require `subject_role='professional'`; caller-side reasons (`caller_no_show`, `caller_disconnect`) require `subject_role='caller'`. Mismatch returns 400 with `reason_code` field error. (Follow-up: a generic `admin_other` reason valid for either role can be added if frontend needs to issue strikes for off-platform misconduct that doesn't fit the existing 5 codes.)

Side effects: increments user's counting strikes; if this crosses the ban threshold, auto-suspends the user (same logic as the call-resolver path). Emits an `OutboxEventType.STRIKE_ISSUED_BY_ADMIN` event for downstream notification.

---

## Summary for Backend

All endpoints listed in this doc are now shipped. Notes for frontend:

**Shape changes on existing endpoints:**
- `GET /admin/reviews` and `POST /admin/reviews/:id/hide` now return `AdminReviewView` (adds `hidden_at`, `hidden_by_admin_id`, `hide_reason`, embeds `subject` user object)
- `GET /admin/strikes` now returns `AdminStrikeView` with embedded `subject: { id, name, avatar_url, role }` instead of bare `subject_user_id`

**New endpoints:**
- `GET /admin/reviews/:id` — `AdminReviewDetailView` (adds `call` + `audit_trail`)
- `POST /admin/reviews/:id/unhide` — returns `AdminReviewView`
- `GET /admin/strikes/:id` — `AdminStrikeDetailView` (adds `related_call`, `related_booking`, `subject_strike_history`, `audit_trail`)
- `POST /admin/strikes` — manual issuance, returns 201 + `AdminStrikeView`

**Decisions captured in code:**
- Auto-unsuspend on void: not implemented (manual via `/admin/users/:id/unsuspend`). See inline comment on `adminVoidStrike`.
- Manual strike reason↔role: strict pairing enforced. A generic `admin_other` reason can be added later if needed.
- Unhide restores `is_public = TRUE`; original user choice not preserved separately.

All new endpoints: STAFF role gate (`['admin','support']`), `auditAdmin` middleware, standard `{success, data, meta?}` envelope.