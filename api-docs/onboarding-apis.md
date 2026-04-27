# Onboarding API Reference

> Backend service for ohlify. Onboarding endpoints drive role selection, KYC progress, and handle management. All endpoints require a Bearer access token. Read **Common conventions** once, then jump to the endpoint of interest.

**Base URL:** `https://api.ohlify.com` (prod) · `http://localhost:8080` (local)
**Version prefix:** `/api/v1`

---

## Table of Contents

| # | Method | Path | Auth | Purpose |
|---|---|---|---|---|
| 1 | GET | `/api/v1/onboarding/status` | Bearer | Current onboarding step + KYC progress |
| 2 | POST | `/api/v1/onboarding/role` | Bearer | Choose `client` or `professional` role |
| 3 | PATCH | `/api/v1/onboarding/kyc/client` | Bearer | Incremental save of client KYC fields |
| 4 | PATCH | `/api/v1/onboarding/kyc/professional` | Bearer | Incremental save of professional KYC fields |
| 5 | GET | `/api/v1/onboarding/handle/check?handle=…` | Bearer | Real-time handle availability check |
| 6 | POST | `/api/v1/me/handle` | Bearer | Post-onboarding handle rename (30-day cooldown) |
| 7 | POST | `/api/v1/onboarding/kyc/complete` | Bearer | Submit KYC for review/auto-approve |

> **Related endpoints (separate docs):** bank account is at `PUT /me/bank-account` (profile API), rates are at `POST /me/rates` (rates API). Both count toward professional KYC progress.

---

## Common conventions

### 1. Response envelope

Every response — success or error — uses one of these two shapes:

**Success**
```json
{
  "data": { /* endpoint-specific payload */ },
  "meta": { /* optional, only on paginated endpoints */ }
}
```

**Error**
```json
{
  "error": {
    "code": "snake_case_code",
    "message": "Human-readable message",
    "field_errors": { "field": ["msg1", "msg2"] }
  }
}
```

`field_errors` is present on validation-style errors — `validation_error` (400) and `category_invalid` (422). Treat any error body that includes `field_errors` as a per-field validation problem.

### 2. Error code catalog

Every code below is a snake_case string returned in `error.code`. UI/i18n must key off `code` — never the human `message`.

| Code | Meaning | Typical HTTP |
|---|---|---|
| `validation_error` | Request body/query failed Zod validation | 400 |
| `unauthorized` | Bearer header missing, malformed, or JWT invalid/expired | 401 |
| `token_invalid` | JWT decoded fine but the user row is missing or soft-deleted | 401 |
| `role_mismatch` | User's role doesn't match endpoint requirement (client vs pro) | 403 |
| `role_already_set` | Trying to switch role after KYC progress or `full_name` is set | 409 |
| `handle_invalid_format` | Handle Zod-passes but service regex (`^[a-z0-9_]{3,24}$`) rejects | 400 |
| `handle_reserved` | Handle is on the reserved list | 400 |
| `handle_taken` | Handle is owned by another user, or in `handle_redirects` (90-day) | 409 |
| `handle_cooldown` | Within the 30-day rename cooldown | 429 |
| `kyc_incomplete` | `POST /onboarding/kyc/complete` called with missing items | 422 |
| `rate_limited` | Per-route or global IP rate limit hit | 429 |
| `not_found` | Route doesn't exist | 404 |
| `internal` | Unhandled exception caught by the error handler | 500 |

> **Two flavors of 401:** `unauthorized` (header/signature problem) is thrown by the auth middleware before the request reaches the controller. `token_invalid` is thrown by the service when the user is gone (soft-deleted, wiped). Clients that need to distinguish between "log in again" and "the account no longer exists" should branch on `code`.

### 3. Headers

**Send on every request:**

| Header | When | Notes |
|---|---|---|
| `Authorization: Bearer <jwt>` | All endpoints | HS256 access token, 15-min TTL |
| `Content-Type: application/json` | All POST/PATCH with a body | Required for JSON parsing |
| `Origin` | Browsers send automatically | Must match `WEB_BASE_URL` env or CORS rejects |

**Receive on every response:**

| Header | Meaning |
|---|---|
| `x-request-id` | ULID for log correlation. Include in bug reports. |
| `RateLimit-Policy` | `120;w=60` — global limit |
| `RateLimit-Limit` | Max requests in current global window |
| `RateLimit-Remaining` | Requests left before global 429 |
| `RateLimit-Reset` | Seconds until the global window resets |
| `X-RateLimit-Remaining` | Per-route rate limit remaining (only set when route has its own limit, e.g. `handle/check`) |
| `Retry-After` | Seconds — present on every 429 (rate limit, handle cooldown). For `handle_cooldown` this can be up to ~30 days (`2_592_000`). |
| Standard security headers | `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `X-Frame-Options: SAMEORIGIN`, full CSP, `Referrer-Policy: no-referrer`, etc. (helmet defaults) |

### 4. Rate limits

Two layers stack. Whichever fires first wins.

1. **Global rate limit** — 120 requests / 60 seconds, per IP, all routes. Returns `429 rate_limited` with `Retry-After`.
2. **Per-route rate limit** — only `GET /onboarding/handle/check` has one (60 / 60 sec, keyed per user). Returns `429 rate_limited` with `Retry-After` and `X-RateLimit-Remaining: 0`.

There is no service-level rate limit on onboarding endpoints other than the natural one imposed by the 30-day handle cooldown.

### 5. Field constraints (referenced throughout)

- **email** — RFC 5322. Stored case-insensitive (`CITEXT`).
- **phone** — E.164 format: `^\+[1-9]\d{7,14}$`.
- **role** — exactly one of `"client"` | `"professional"`.
- **handle** —
  - Wire format: 3–24 chars, lowercased server-side.
  - Regex: `^[a-z0-9_]{3,24}$` (lowercase letters, digits, underscore).
  - Below 3 / above 24 / empty → `validation_error` (Zod).
  - Other invalid characters (e.g. dash, dot, capital before lowercase) → `handle_invalid_format`.
  - On the reserved list (`admin`, `api`, `support`, `help`, `www`, `settings`, `auth`, `login`, `register`, `profile`, `calls`, `wallet`, `notifications`, `legal`, `eula`, `privacy`, `terms`, `ohlify`, `app`, `mobile`, `web`, `static`, `public`, `cdn`, `me`, `onboarding`, `home`, `professionals`, `feedback`, `rating`, `banks`, `payments`, `webhooks`, `health`, `docs`, `about`, `contact`, `pricing`, `blog`, `news`, `press`, `jobs`, `careers`, `privacy_policy`, `tos`) → `handle_reserved`.
- **full_name** — 2–120 chars. Whitespace-only stores fine but does NOT count toward KYC completion (server uses `.trim().length`).
- **description** — max 1000 chars (client) or 2000 chars (professional). Empty/null is allowed.
- **occupation** — 2–120 chars. Professional only.
- **interests** — array of up to 20 strings, each 1–60 chars. Empty array stores fine but does NOT count toward completion.
- **identity.type** — exactly one of `"nin"` | `"bvn"` | `"passport"` | `"drivers_license"`.
- **identity.number** — 4–40 chars.
- **identity.document_upload_id** — optional, 1–120 chars (file_key from uploads microservice).

### 6. KYC item lists

Used by `GET /onboarding/status` and `POST /onboarding/kyc/complete`.

**Client (3 items):** `full_name`, `description`, `interests`.

**Professional (8 items):** `full_name`, `handle`, `occupation`, `description`, `interests`, `bank_account`, `identity`, `rates`.

The last three for pros are derived from sibling tables, NOT from the `users` row:
- `bank_account` ⇐ presence of a row in `bank_accounts` for this user (managed via `PUT /me/bank-account`).
- `identity` ⇐ presence of any row in `kyc_submissions` for this user (created when `PATCH /onboarding/kyc/professional` is called with an `identity` field).
- `rates` ⇐ presence of any active row in `professional_rates` for this user (managed via `POST /me/rates`).

### 7. CORS

Only the origin in `env.WEB_BASE_URL` is allowed. `credentials: true`. Methods: `GET, HEAD, PUT, PATCH, POST, DELETE`. Preflights respond `204`.

### 8. Status codes summary

- `200` — success on read or update (most onboarding endpoints)
- `400` — validation failed, or handle violates regex/reserved list
- `401` — auth failed (`unauthorized` or `token_invalid`)
- `403` — role mismatch
- `404` — route not found
- `409` — role already confirmed; handle taken
- `422` — KYC incomplete; invalid category value
- `429` — rate-limited or within handle cooldown
- `500` — unhandled exception

---

# Endpoint specifications

---

## 1. GET `/api/v1/onboarding/status`

Returns the user's current onboarding step plus a per-item KYC progress breakdown.

**Auth:** Bearer access token required
**Per-route rate limit:** none (global only)

### Request

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <access_token>` |

No body, no query params.

### Responses

#### 200 OK

```json
{
  "data": {
    "step": "role_selection",
    "role": "client",
    "kyc_progress": {
      "completed_items": [],
      "total_items": 3,
      "percent": 0
    }
  }
}
```

| Field | Type | Notes |
|---|---|---|
| `step` | enum | `"role_selection"` \| `"client_kyc"` \| `"professional_kyc"` \| `"complete"` |
| `role` | enum | `"client"` \| `"professional"` (defaults to `"client"` server-side) |
| `kyc_progress.completed_items` | string[] | Subset of the role's KYC item list |
| `kyc_progress.total_items` | int | `3` for clients, `8` for professionals |
| `kyc_progress.percent` | int | `round(completed / total * 100)`. `0` when `total = 0` |

**`step` derivation:**
- `"complete"` only when **both** `users.kyc_status = 'approved'` AND `completed_items.length === total_items`. Status is derived from items, not blindly trusted — see "Status demotion" below.
- `"role_selection"` if `kyc_status = 'none'` AND `full_name = null` AND `completed_items` is empty (heuristic for "user hasn't engaged yet").
- Otherwise `"client_kyc"` or `"professional_kyc"` per `users.role`.

**Status demotion (added 2026-04-26):**

When a previously-approved user drops below the required item set (e.g. a pro deletes their last `professional_rates` row, or any user runs `DELETE /me/bank-account`), the backend automatically demotes `users.kyc_status` from `'approved'` back to `'pending_review'`. The user must re-call `POST /onboarding/kyc/complete` after re-supplying the missing items. This keeps `kyc_status` honest with the items list — `GET /onboarding/status` will now reflect both fields consistently.

The demote runs after:
- `DELETE /me/bank-account` (profile API)
- `DELETE /me/rates/:id` (rates API) — only takes effect when this was the last active rate

Demote is a no-op for users who weren't `approved` to begin with, or who remain complete after the delete.

#### 401 Unauthorized — missing/malformed Authorization header

```json
{ "error": { "code": "unauthorized", "message": "Missing or malformed Authorization header" } }
```

#### 401 Unauthorized — invalid or expired access token

```json
{ "error": { "code": "unauthorized", "message": "Invalid or expired token" } }
```

#### 401 Unauthorized — token references a deleted user

```json
{ "error": { "code": "token_invalid", "message": "Request failed" } }
```

#### 429 Too Many Requests — global IP rate limit

Headers: `Retry-After: <seconds>`.

```json
{ "error": { "code": "rate_limited", "message": "Too many requests, please try again later" } }
```

---

## 2. POST `/api/v1/onboarding/role`

Sets the user's role. Once role is "confirmed" (any KYC progress made or `full_name` populated), it cannot change.

**Auth:** Bearer access token required
**Per-route rate limit:** none

### Request

```json
{ "role": "professional" }
```

| Field | Type | Required | Constraint |
|---|---|---|---|
| `role` | enum | yes | `"client"` \| `"professional"` |

> **Note:** The body schema is **not** `.strict()` — extra unknown keys are silently dropped. This is the only onboarding endpoint that doesn't reject extras.

### Responses

#### 200 OK

```json
{
  "data": {
    "role": "professional",
    "next_step": "professional_kyc"
  }
}
```

`next_step` is `"professional_kyc"` for `role: "professional"` and `"client_kyc"` for `role: "client"`.

#### 400 Bad Request — validation

```json
{
  "error": {
    "code": "validation_error",
    "message": "Validation failed",
    "field_errors": {
      "role": ["Invalid enum value. Expected 'client' | 'professional', received 'admin'"]
    }
  }
}
```

Triggers: `role` missing, not in enum, wrong type.

#### 401 Unauthorized

Both shapes from §1 apply (`unauthorized` for header/JWT issues, `token_invalid` for deleted user).

#### 409 Conflict — role already confirmed

```json
{ "error": { "code": "role_already_set", "message": "Request failed" } }
```

Trigger: switching role after `users.kyc_status !== 'none'` OR `users.full_name` is non-null. The same role can be re-set without conflict.

---

## 3. PATCH `/api/v1/onboarding/kyc/client`

Incremental save of client KYC fields. All fields optional. Body is `.strict()` — unknown keys rejected.

**Auth:** Bearer access token, role must be `client`
**Per-route rate limit:** none

### Request

```json
{
  "full_name": "Adedeji Bamidele",
  "description": "Short bio",
  "interests": ["Technology", "Relationship"]
}
```

| Field | Type | Required | Constraint |
|---|---|---|---|
| `full_name` | string | optional | 2–120 chars |
| `description` | string | optional | 0–1000 chars |
| `interests` | string[] | optional | 0–20 items, each 1–60 chars |

> **Whitespace-only `full_name`** stores fine but doesn't count toward completion (server uses `.trim().length > 0`). Same for `description` and empty arrays for `interests`.

### Responses

#### 200 OK

```json
{
  "data": {
    "kyc_progress": {
      "completed_items": ["full_name", "interests"],
      "total_items": 3,
      "percent": 67
    }
  }
}
```

#### 400 Bad Request — validation

```json
{
  "error": {
    "code": "validation_error",
    "message": "Validation failed",
    "field_errors": {
      "full_name": ["String must contain at least 2 character(s)"],
      "interests.0": ["String must contain at most 60 character(s)"],
      "_root": ["Unrecognized key(s) in object: 'unknown_field'"]
    }
  }
}
```

The `_root` key is used when extra keys are sent (strict-schema violation).

#### 401 Unauthorized

Both `unauthorized` (header/JWT) and `token_invalid` (user gone) shapes apply. See §1.

#### 403 Forbidden — role mismatch

```json
{ "error": { "code": "role_mismatch", "message": "Request failed" } }
```

Trigger: `users.role !== 'client'`.

#### 429 Too Many Requests — global IP rate limit

```json
{ "error": { "code": "rate_limited", "message": "Too many requests, please try again later" } }
```

**Side-effects:** updates `users` columns (`full_name`, `description`, `interests`) for fields supplied. Empty body returns current progress without updating.

---

## 4. PATCH `/api/v1/onboarding/kyc/professional`

Incremental save of professional KYC fields. **Bank account and rates are managed by their own endpoints** (`PUT /me/bank-account` and `POST /me/rates`).

**Auth:** Bearer access token, role must be `professional`
**Per-route rate limit:** none

### Request

```json
{
  "full_name": "Olu Aremu",
  "handle": "oluaremu",
  "occupation": "Senior sales manager",
  "description": "...",
  "interests": ["Technology"],
  "identity": {
    "type": "nin",
    "number": "12345678901",
    "document_upload_id": "kyc/u_01jx.../12345678901.jpg"
  }
}
```

| Field | Type | Required | Constraint |
|---|---|---|---|
| `full_name` | string | optional | 2–120 chars |
| `handle` | string | optional | 3–24 chars; lowercased server-side; regex `^[a-z0-9_]{3,24}$`; not on reserved list; not taken |
| `occupation` | string | optional | 2–120 chars |
| `description` | string | optional | 0–2000 chars |
| `interests` | string[] | optional | 0–20 items, each 1–60 chars |
| `identity` | object | optional | See below |
| `identity.type` | enum | yes (if `identity` sent) | `"nin"` \| `"bvn"` \| `"passport"` \| `"drivers_license"` |
| `identity.number` | string | yes (if `identity` sent) | 4–40 chars |
| `identity.document_upload_id` | string | optional | 1–120 chars |

> **Setting `handle` here also stamps `users.handle_changed_at`**, so the 30-day cooldown for `POST /me/handle` engages from this point onward.

### Responses

#### 200 OK

```json
{
  "data": {
    "kyc_progress": {
      "completed_items": ["full_name", "handle", "occupation", "interests", "identity"],
      "total_items": 8,
      "percent": 63
    }
  }
}
```

#### 400 Bad Request — validation

Two flavors:

**Zod-level (length, type, enum, strict):**
```json
{
  "error": {
    "code": "validation_error",
    "message": "Validation failed",
    "field_errors": {
      "handle": ["String must contain at least 3 character(s)"],
      "identity.type": ["Invalid enum value. Expected 'nin' | 'bvn' | 'passport' | 'drivers_license', received 'foo'"]
    }
  }
}
```

**Service-level (handle regex):**
```json
{ "error": { "code": "handle_invalid_format", "message": "Request failed" } }
```

Trigger: handle Zod-passes (3–24 chars, lowercased) but contains characters other than `[a-z0-9_]` (e.g. dash).

#### 400 Bad Request — handle reserved

```json
{ "error": { "code": "handle_reserved", "message": "Request failed" } }
```

#### 401 Unauthorized

Same as §1.

#### 403 Forbidden — role mismatch

```json
{ "error": { "code": "role_mismatch", "message": "Request failed" } }
```

Trigger: `users.role !== 'professional'`.

#### 409 Conflict — handle taken

```json
{ "error": { "code": "handle_taken", "message": "Request failed" } }
```

Trigger: handle owned by another active user OR present in `handle_redirects` with non-expired `expires_at` (90-day window).

#### 429 Too Many Requests — global IP rate limit

```json
{ "error": { "code": "rate_limited", "message": "Too many requests, please try again later" } }
```

**Side-effects:**
- Updates supplied `users` columns.
- When `handle` is provided AND differs from current value, also stamps `users.handle_changed_at = now()`.
- When `identity` is supplied, inserts a new row into `kyc_submissions` with `status = 'pending_review'`. Each call with `identity` creates a new audit-trail row (no upsert).

---

## 5. GET `/api/v1/onboarding/handle/check?handle=<handle>`

Real-time handle availability check. Designed to be called on every keystroke from the frontend (debounced).

**Auth:** Bearer access token required
**Per-route rate limit:** 60 requests / 60 seconds **per user** (`handle-check:{userId}` Redis key)
**Cache:** positive answers cached 60s under `handle:check:{handle}` to absorb rapid identical queries

### Request

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <access_token>` |

| Query | Required | Constraint |
|---|---|---|
| `handle` | yes | 1–64 chars; lowercased server-side |

### Responses

#### 200 OK — available

```json
{ "data": { "available": true, "normalized": "seidu23" } }
```

#### 200 OK — unavailable

```json
{
  "data": {
    "available": false,
    "reason": "taken",
    "suggestions": ["seidu23_42", "seidu2342", "seidu23_701"]
  }
}
```

| Field | Type | Notes |
|---|---|---|
| `reason` | enum | `"taken"` \| `"invalid_format"` \| `"reserved"` |
| `suggestions` | string[] | 3 candidate handles, all valid format and ≤24 chars |

> **Important:** *format* and *reserved* problems are reported as `available: false` (200), NOT as 400 errors. Length/missing-param problems are reported as 400 — see below.

`reason` semantics:
- `"taken"` — owned by another active user, or in `handle_redirects` (90-day) for someone else.
- `"invalid_format"` — fails the `^[a-z0-9_]{3,24}$` regex but passed Zod (i.e. 1–64 chars and not empty).
- `"reserved"` — on the reserved list.

#### 400 Bad Request — missing or empty `handle`

```json
{
  "error": {
    "code": "validation_error",
    "message": "Invalid handle query parameter",
    "field_errors": { "handle": ["handle is required"] }
  }
}
```

Trigger: `handle` missing entirely, empty string, or > 64 chars (Zod rejects before reaching the service). Note this contradicts the "format issues are 200 not 400" rule; only length-bound and missing trigger 400.

#### 401 Unauthorized

Same as §1.

#### 429 Too Many Requests — per-user rate limit

Headers: `Retry-After: <seconds>`, `X-RateLimit-Remaining: 0`.

```json
{ "error": { "code": "rate_limited", "message": "Too many requests, please try again later" } }
```

**Side-effects:** populates `handle:check:{handle}` cache (`available` or `taken`) with 60s TTL. No DB writes.

---

## 6. POST `/api/v1/me/handle`

Post-onboarding handle rename. Subject to a 30-day cooldown stored on `users.handle_changed_at`.

**Auth:** Bearer access token, role must be `professional`
**Per-route rate limit:** none (cooldown enforced at service level)

### Request

```json
{ "handle": "new_handle" }
```

| Field | Type | Required | Constraint |
|---|---|---|---|
| `handle` | string | yes | 3–24 chars; lowercased server-side; regex; not reserved; not taken |

### Responses

#### 200 OK — renamed

```json
{
  "data": {
    "handle": "new_handle",
    "share_url": "https://ohlify.com/new_handle",
    "previous_handle_redirects_until": "2026-07-24T21:49:09.313Z"
  }
}
```

| Field | Type | Notes |
|---|---|---|
| `handle` | string | The new (or unchanged) handle |
| `share_url` | string | Always `https://ohlify.com/<handle>` |
| `previous_handle_redirects_until` | ISO-8601 | When the redirect from the OLD handle expires (90 days from now). When the user had no prior handle, this is still set but no `handle_redirects` row is created. |

#### 400 Bad Request — validation (length / type)

```json
{
  "error": {
    "code": "validation_error",
    "message": "Validation failed",
    "field_errors": { "handle": ["String must contain at least 3 character(s)"] }
  }
}
```

#### 400 Bad Request — handle invalid format

```json
{ "error": { "code": "handle_invalid_format", "message": "Request failed" } }
```

Trigger: passes Zod (3–24 chars) but fails service regex (e.g. contains `-` or `.`).

#### 400 Bad Request — handle reserved

```json
{ "error": { "code": "handle_reserved", "message": "Request failed" } }
```

#### 401 Unauthorized

Same as §1.

#### 403 Forbidden — non-professional

```json
{ "error": { "code": "role_mismatch", "message": "Request failed" } }
```

#### 409 Conflict — handle taken

```json
{ "error": { "code": "handle_taken", "message": "Request failed" } }
```

Trigger: owned by another active user, or in `handle_redirects` (someone else's) within 90 days.

#### 429 Too Many Requests — within cooldown

Headers: `Retry-After: <seconds>` (up to ~2_592_000 = 30 days when freshly stamped).

```json
{ "error": { "code": "handle_cooldown", "message": "Request failed" } }
```

> **Quirk:** the cooldown check fires BEFORE the same-handle short-circuit. If you call this with the user's current handle while inside the cooldown window, you get `429 handle_cooldown` instead of a graceful 200 no-op. Outside the cooldown, calling with the current handle returns 200 without bumping the cooldown.

**Side-effects:**
- Updates `users.handle` to the new value and stamps `users.handle_changed_at = now()`.
- Inserts a row into `handle_redirects` with `old_handle = <previous>`, `user_id = <this user>`, `expires_at = now() + 90 days`. Skipped if the user had no prior handle.

---

## 7. POST `/api/v1/onboarding/kyc/complete`

Submits KYC for review. With `kyc.auto_approve = true` (current MVP setting), this auto-approves and marks the user complete. The `pending_review` branch is wired but currently unreachable in MVP.

**Auth:** Bearer access token required
**Per-route rate limit:** none

### Request

Empty body (`{}` or no body at all).

### Responses

#### 200 OK — KYC accepted

```json
{
  "data": {
    "kyc_status": "approved",
    "next_step": "complete"
  }
}
```

`kyc_status` is currently always `"approved"` in MVP. Once `kyc.auto_approve` is flipped to `false`, it can also return `"pending_review"`.

#### 401 Unauthorized

Same as §1.

#### 422 Unprocessable Entity — KYC incomplete

```json
{ "error": { "code": "kyc_incomplete", "message": "Request failed" } }
```

Trigger: required items missing for the user's role.
- Client missing `full_name`, `description`, OR `interests`.
- Professional missing any of `full_name`, `handle`, `occupation`, `description`, `interests`, `bank_account`, `identity`, `rates`.

#### 429 Too Many Requests — global IP rate limit

```json
{ "error": { "code": "rate_limited", "message": "Too many requests, please try again later" } }
```

**Side-effects (when complete):**
- Sets `users.kyc_status = 'approved'` (or `'pending_review'` if auto-approve is off).
- Sets `users.kyc_submitted_at = now()`.
- When auto-approved, also sets `users.kyc_reviewed_at = now()`.
- **Not idempotent in side effects:** calling again after success re-stamps `kyc_submitted_at` and `kyc_reviewed_at` each time, even though the status is already `approved`. Body returns 200 either way.

---

# Cross-cutting concerns

## Onboarding flow (typical happy path)

```
Step 1  →  POST /auth/register/* (auth API)            user account created
Step 2  →  GET  /onboarding/status                     200, step="role_selection"
Step 3  →  POST /onboarding/role                       200, next_step="<role>_kyc"
Step 4a →  PATCH /onboarding/kyc/client                  ⎫
                — or —                                   ⎬  …repeat until all items done
Step 4b →  PATCH /onboarding/kyc/professional            ⎪
           PUT  /me/bank-account     (profile API)       ⎪
           POST /me/rates            (rates API)         ⎭
Step 5  →  POST /onboarding/kyc/complete               200, kyc_status="approved"
Step 6  →  GET  /onboarding/status                     200, step="complete"
```

## Handle lifecycle

```
First time:
  PATCH /onboarding/kyc/professional { handle: "x" }
    → users.handle = "x", users.handle_changed_at = now()
    → 30-day cooldown begins NOW

Within cooldown:
  POST /me/handle { handle: ... }      → 429 handle_cooldown

After 30 days:
  POST /me/handle { handle: "y" }
    → users.handle = "y", users.handle_changed_at = now()
    → handle_redirects: old_handle="x", expires_at = now() + 90 days
    → "x" cannot be claimed by anyone (incl. this user) until the redirect expires
```

## Idempotency & retries

Onboarding endpoints are NOT idempotent on the `Idempotency-Key` header (the middleware exists but isn't applied to these routes). Practical guidance:

- `PATCH /onboarding/kyc/*` is naturally idempotent — re-sending the same body is safe.
- `POST /onboarding/role` is naturally idempotent for the same role.
- `POST /me/handle` is **not** safe to blind-retry: a successful response stamps cooldown; a retry will hit 429.
- `POST /onboarding/kyc/complete` re-stamps timestamps on each call but never re-rejects.

## What clients should i18n on

`error.code` is stable and should drive UI strings. `error.message` is a debug aid and may change. `field_errors` values currently come from Zod and are English-only — wrap them in a translation layer or display them only on dev builds. The `category_invalid` error (a 422 returned by `PATCH /me`, profile API) also includes `field_errors` and is the only non-`validation_error` code that does so consistently.
