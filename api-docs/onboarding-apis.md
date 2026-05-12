# Onboarding API Reference

> Backend service for ohlify. Onboarding endpoints drive role selection, KYC progress, and handle management. All endpoints require a Bearer access token. Read **Common conventions** once, then jump to the endpoint of interest.

**Base URL:** `https://api.ohlify.com` (prod) · `http://localhost:8082` (local)
**Version prefix:** `/api/v1`

---

## Table of Contents

| # | Method | Path | Auth | Purpose |
|---|---|---|---|---|
| 1 | GET | `/api/v1/onboarding/status` | Bearer | Current onboarding step + KYC progress |
| 2 | GET | `/api/v1/onboarding/kyc/spec` | Bearer | Full KYC item spec — what to render, current values, completeness. Drives the entire KYC screen. |
| 3 | POST | `/api/v1/onboarding/role` | Bearer | Choose `client` or `professional` role |
| 4 | PATCH | `/api/v1/onboarding/kyc/client` | Bearer | Incremental save of client KYC fields |
| 5 | PATCH | `/api/v1/onboarding/kyc/professional` | Bearer | Incremental save of professional KYC fields |
| 6 | GET | `/api/v1/onboarding/handle/check?handle=…` | Bearer | Real-time handle availability check |
| 7 | POST | `/api/v1/me/handle` | Bearer | Post-onboarding handle rename (30-day cooldown) |
| 8 | POST | `/api/v1/onboarding/kyc/complete` | Bearer | Submit KYC for review/auto-approve |

> **Related endpoints (separate docs):** bank account is at `PUT /me/bank-account` (profile API), rates are at `POST /me/rates` (rates API). Both count toward professional KYC progress. ID-document and selfie photos are uploaded via the external file service — see [`file-uploads-apis.md`](./file-uploads-apis.md).
>
> **New:** the KYC item list per role is **driven by `platform_config`** (keys `kyc.professional_items` and `kyc.client_items`). `GET /onboarding/kyc/spec` is the canonical way to render the screen — see §2 and `onboarding-kyc-spec.md` for the full schema. The legacy hardcoded `PROFESSIONAL_KYC_ITEMS` / `CLIENT_KYC_ITEMS` arrays are gone.

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
| `kyc_incomplete` | `POST /onboarding/kyc/complete` called with missing items. Carries `field_errors.incomplete_items: string[]` listing the missing item keys. | 422 |
| `identity_required_first` | `PATCH /onboarding/kyc/professional` body included `selfie` but the user has no prior `kyc_submissions` row to attach it to. Submit `identity` first. | 422 |
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
- **identity.document_upload_key** — file-service key (uuid + extension), regex `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|pdf)$`. Obtained via the file-uploads service. **Required for the `identity` item to count as complete.**
- **identity.document_upload_id** — *deprecated* alias for `document_upload_key`, accepted for back-compat. New clients should use `document_upload_key`.
- **selfie.upload_key** — same regex as `document_upload_key` but extension restricted to `jpg|jpeg|png` for the selfie kind.

### 6. KYC item lists

Used by `GET /onboarding/status`, `GET /onboarding/kyc/spec`, and `POST /onboarding/kyc/complete`.

**The required item set is now driven by `platform_config`.** Two keys, both `is_public = TRUE`:

- `kyc.client_items` — JSON array of `KycItemSpec` for client onboarding.
- `kyc.professional_items` — JSON array of `KycItemSpec` for professional onboarding.

Admins edit both keys via `PATCH /admin/config`. Changes propagate immediately (in-memory snapshot reload).

**Default seeded values:**

- **Client (2 items):** `full_name`, `interests`.
- **Professional (9 items):** `full_name`, `handle`, `occupation`, `description`, `interests`, `bank_account`, `identity`, `selfie`, `rates`.

**Items NOT stored on the `users` row** are derived from sibling tables:
- `bank_account` ⇐ presence of a row in `bank_accounts` for this user (managed via `PUT /me/bank-account`).
- `identity` ⇐ presence of a `kyc_submissions` row **with** `document_upload_id` populated (created when `PATCH /onboarding/kyc/professional` is called with an `identity` object including `document_upload_key`).
- `selfie` ⇐ `kyc_submissions.selfie_upload_key` populated (set when `PATCH /onboarding/kyc/professional` is called with a `selfie` field).
- `rates` ⇐ presence of any active row in `professional_rates` for this user (managed via `POST /me/rates`).

> **Renderer pairing.** The frontend should call `GET /onboarding/kyc/spec` (§2) which returns the admin-defined items for the caller's role with current values + per-item completeness. Don't try to reconstruct the list from `kyc_progress.completed_items` alone — `progress` only tells you *what's done*, not *what's required*.

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
| `step` | enum | `"role_selection"` \| `"client_kyc"` \| `"professional_kyc"` \| `"kyc_rejected"` \| `"complete"` |
| `role` | enum | `"client"` \| `"professional"` (defaults to `"client"` server-side) |
| `kyc_progress.completed_items` | string[] | Keys of items the user has completed (subset of `kyc.{role}_items`). |
| `kyc_progress.total_items` | int | Number of `enabled && required` items in the role's config. Defaults to **2** for clients, **9** for professionals; can shift if an admin toggles items. |
| `kyc_progress.percent` | int | `round(completed / total * 100)`. `0` when `total = 0` |
| `kyc_rejection` | object \| null | Non-null only when `step === "kyc_rejected"`. See below. |

**`kyc_rejection` shape (only when `step === "kyc_rejected"`):**

```json
{
  "kyc_rejection": {
    "reason_code": "document_unclear",
    "note": "ID photo was blurry. Please reupload a sharper image.",
    "reviewed_at": "2026-05-10T13:42:00.000Z",
    "submission_id": "kyc_01HZ...",
    "latest_submission_status": "rejected",
    "item_keys": ["identity", "selfie"]
  }
}
```

| Field | Type | Notes |
|---|---|---|
| `reason_code` | enum | `document_unclear` \| `identity_mismatch` \| `expired_document` \| `fraudulent` \| `other`. |
| `note` | string \| null | Admin's free-text explanation. Shown verbatim on the user's rejection screen. |
| `reviewed_at` | ISO date \| null | When the admin acted. |
| `submission_id` | string | The latest `kyc_submissions` row ID. |
| `latest_submission_status` | enum | `rejected` (user hasn't resubmitted yet) or `pending_review` (user resubmitted, awaiting re-review). The parent `step` stays `"kyc_rejected"` until admin acts again, so use this to switch the rejection UI between "show reason + Resubmit" and "show awaiting-review". |
| `item_keys` | string[] | **Per-item resubmission set.** Empty array `[]` means whole-submission rejection — the user must redo every item (legacy behavior). Non-empty means **partial rejection**: the user only needs to re-upload the listed items. The user-facing KYC screen locks every item NOT in this set; the server also enforces this on PATCH (see §5). |

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

## 2. GET `/api/v1/onboarding/kyc/spec`

Returns the **full KYC item spec** for the caller's role: which items to render, what kind each is, the validation rules, the user's current saved value (when any), and a per-item `complete` flag. This is the canonical input for the KYC screen — render one tile/modal per item, seed forms with `value`, tick when `complete` is true.

This endpoint *replaces* the legacy "infer items from `kyc_progress.completed_items` + frontend-hardcoded list" pattern. The list lives in `platform_config` and admins can reorder, relabel, or toggle items without a frontend deploy.

**Auth:** Bearer access token required
**Per-route rate limit:** none (global only)

### Request

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <access_token>` |

No body, no query params. Role is derived from the authenticated user.

### Responses

#### 200 OK

```jsonc
{
  "data": {
    "role": "professional",
    "items": [
      {
        "key": "full_name",
        "kind": "text",
        "label": "Full name",
        "subtitle": "Enter your full legal name as it appears on your ID.",
        "required": true,
        "enabled": true,
        "validation": [
          { "rule": "min_length", "value": 2 },
          { "rule": "max_length", "value": 80 }
        ],
        "value": "Olarewaju Feranmi",
        "complete": true
      },
      {
        "key": "handle",
        "kind": "handle",
        "label": "Username",
        "subtitle": "A unique handle others can find you by.",
        "required": true,
        "enabled": true,
        "validation": [
          {
            "rule": "regex",
            "value": "^[a-z0-9_]{3,20}$",
            "message": "3–20 chars, lowercase letters, digits, or underscore."
          }
        ],
        "value": null,
        "complete": false
      },
      {
        "key": "bank_account",
        "kind": "bank",
        "label": "Bank account",
        "subtitle": "Where we send your payouts.",
        "required": true,
        "enabled": true,
        "validation": [],
        "value": {
          "bank_code": "058",
          "bank_name": "GTBank",
          "account_number_masked": "******4421",
          "account_name": "OLAREWAJU FERANMI"
        },
        "complete": true
      },
      {
        "key": "identity",
        "kind": "identity",
        "label": "Identity verification",
        "subtitle": "Verify your identity to keep the community safe.",
        "required": true,
        "enabled": true,
        "validation": [
          { "rule": "allowed_id_methods", "value": ["nin","bvn","passport","drivers_license"] },
          {
            "rule": "id_number_per_method",
            "value": {
              "nin":             { "rule": "regex", "value": "^[0-9]{11}$" },
              "bvn":             { "rule": "regex", "value": "^[0-9]{11}$" },
              "passport":        { "rule": "regex", "value": "^[A-Z0-9]{8,10}$" },
              "drivers_license": { "rule": "regex", "value": "^[A-Z0-9]{8,12}$" }
            }
          }
        ],
        "value": {
          "method": "nin",
          "id_number_masked": "*******8901",
          "document_upload_key": "8204e793-128e-48cb-a790-9fd9b2dbb61c.jpg"
        },
        "complete": true
      },
      {
        "key": "selfie",
        "kind": "selfie",
        "label": "Selfie",
        "subtitle": "Take a clear photo of your face. We compare it with your ID.",
        "required": true,
        "enabled": true,
        "validation": [{ "rule": "allowed_extensions", "value": ["jpg","jpeg","png"] }],
        "value": null,
        "complete": false
      },
      {
        "key": "rates",
        "kind": "rates",
        "label": "Rates",
        "subtitle": "Set what you charge per call type and duration.",
        "required": true,
        "enabled": true,
        "validation": [{ "rule": "min_items", "value": 1 }],
        "value": [
          { "id": "rt_01...", "call_type": "audio", "duration_minutes": 15, "price_kobo": 500000 }
        ],
        "complete": true
      }
    ],
    "completed_count": 4,
    "total_required": 9,
    "all_complete": false,
    "resubmission": null
  }
}
```

| Field | Type | Notes |
|---|---|---|
| `role` | enum | `"client"` \| `"professional"` |
| `items` | KycItemSpec[] | Only items where `enabled = true`. Disabled items are omitted entirely. |
| `completed_count` | int | Number of `required && complete` items. |
| `total_required` | int | Number of `required` items. |
| `all_complete` | bool | `true` iff every required item is complete — equivalent to `completed_count === total_required`. Use this as the gate for `POST /onboarding/kyc/complete`. |
| `resubmission` | object \| null | Set when the user is in a partial-rejection state. See below. |

**`resubmission` shape (only when the user is in `kyc_rejected` with admin-flagged items):**

```json
{
  "resubmission": {
    "submission_id": "kyc_01HZ...",
    "item_keys": ["identity", "selfie"],
    "reason_code": "document_unclear",
    "note": "ID photo was blurry."
  }
}
```

`null` when there's no active rejection scope. Whole-submission rejections (admin didn't pick specific items) and post-resubmit awaiting-review states also surface as `null` — there's nothing to scope. When non-null with a non-empty `item_keys`, the client should:

- Render every `items[i]` whose `key` is **not** in `item_keys` as **locked / read-only** (the server also enforces this; see §4–§5 for the 403).
- Scope the progress bar + the `kyc/complete` gate to just the items in the set.

**Per-item shape — `KycItemSpec`:**

| Field | Type | Notes |
|---|---|---|
| `key` | string | Stable identifier — `full_name`, `handle`, `occupation`, `description`, `interests`, `bank_account`, `identity`, `selfie`, `rates`. |
| `kind` | string | Determines which widget to render — `text`, `textarea`, `tags`, `handle`, `bank`, `identity`, `selfie`, `rates`, `image_upload`. |
| `label` | string | Heading shown in the tile + modal. |
| `subtitle` | string | Helper text under the label. |
| `required` | bool | When `false`, item is shown but doesn't block `kyc/complete`. |
| `enabled` | bool | Always `true` in the response (disabled items are filtered out server-side). |
| `validation` | ValidationRule[] | Inline-validation rules the frontend interprets. See below. |
| `value` | depends on kind | Currently-saved value, or `null`. Shape depends on `kind` — see "Per-kind value shapes" below. |
| `complete` | bool | Server-computed. True when `value` is present AND passes the kind's completeness check (e.g. for `identity`, the doc upload key must also be set). |

**`validation` rule kinds** (discriminated on `rule`):

| `rule` | `value` shape | Use |
|---|---|---|
| `min_length` / `max_length` | int | String length bounds (`text`, `textarea`, `handle`). |
| `min_items` / `max_items` | int | Array length bounds (`tags`, `rates`). |
| `regex` | string (JS-compatible) | Frontend constructs `new RegExp(value)`. `message` is shown verbatim on mismatch. |
| `numeric_only` | (no value) | Equivalent to `regex: '^[0-9]+$'`; frontend may also set `inputMode="numeric"`. |
| `one_of` | string[] | Allowed string values (radio-style). |
| `allowed_extensions` | string[] | File-picker filter for upload kinds. |
| `allowed_id_methods` | string[] | Subset of `nin`/`bvn`/`passport`/`drivers_license` to show in the identity dropdown. |
| `id_number_per_method` | `Record<method, { rule:'regex', value: string }>` | Per-method regex for the ID number field. |

Backend re-validates everything on save regardless. Frontend rules exist for UX only.

**Per-kind value shapes:**

| `kind` | `value` shape | Save endpoint |
|---|---|---|
| `text` / `textarea` / `handle` | `string` | `PATCH /onboarding/kyc/professional` body `{ [key]: value }` (or `/onboarding/kyc/client`). |
| `tags` | `string[]` | same |
| `bank` | `{ bank_code, bank_name, account_number_masked, account_name }` | `PUT /me/bank-account` |
| `identity` | `{ method, id_number_masked, document_upload_key }` | `PATCH /onboarding/kyc/professional` body `{ identity: { type, number, document_upload_key } }` |
| `selfie` | `{ upload_key }` | `PATCH /onboarding/kyc/professional` body `{ selfie: { upload_key } }` |
| `rates` | `{ id, call_type, duration_minutes, price_kobo }[]` | `POST /me/rates` (per rate) |
| `image_upload` | `{ upload_key }` | item-specific (none today). |

> **PII safety.** `value` only ever contains masked identifiers (account numbers, ID numbers). The full unmasked value lives only on the server. Edits replace the whole value (re-enter ID, re-resolve bank).

#### 401 Unauthorized

Both shapes from §1 apply.

#### 429 Too Many Requests — global IP rate limit

Standard shape; see §1.

**Side-effects:** none. Pure read.

For the long-form rationale and admin-editing surface, see `onboarding-kyc-spec.md`.

---

## 3. POST `/api/v1/onboarding/role`

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

### Partial-rejection scoping (PATCH endpoints)

Both `PATCH /api/v1/onboarding/kyc/client` and `PATCH /api/v1/onboarding/kyc/professional` honor a per-item resubmission scope when the user is in a `kyc_rejected` step. If the latest rejection carries `kyc_rejection.item_keys = ["selfie", "identity"]` (see §1), the server **rejects** any PATCH that touches a key outside that set with a 403:

```json
{
  "error": {
    "code": "item_not_in_resubmit_set",
    "message": "Request failed",
    "field_errors": {
      "item_keys": ["full_name"]
    }
  }
}
```

Empty `item_keys` (whole-submission rejection) imposes no scope — the user may patch any DTO-supported field.

The DTO-supported keys are: `full_name`, `handle`, `occupation`, `description`, `interests`, `identity`, `selfie` (pro), and `full_name`, `description`, `interests` (client). Items whose values live behind their own routes — `bank_account` (`/me/bank-accounts`) and `rates` (`/me/rates`) — are **not** scoped at the server boundary here; the user-facing UI hides those modals when out of scope, and the spec endpoint signals the lock state via `resubmission.item_keys`.

## 4. PATCH `/api/v1/onboarding/kyc/client`

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

## 5. PATCH `/api/v1/onboarding/kyc/professional`

Incremental save of professional KYC fields. **Bank account and rates are managed by their own endpoints** (`PUT /me/bank-account` and `POST /me/rates`). Identity-document and selfie photos are uploaded via the file service first (see [`file-uploads-apis.md`](./file-uploads-apis.md)) — only the resulting `key` is sent here.

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
    "document_upload_key": "8204e793-128e-48cb-a790-9fd9b2dbb61c.jpg"
  },
  "selfie": {
    "upload_key": "ba91d389-66ac-49ce-8c88-410ea73898e1.jpg"
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
| `identity.document_upload_key` | string | optional* | File-service key (`<uuid>.<ext>` where ext ∈ `jpg|jpeg|png|webp|pdf`). *Required for the `identity` item to count as `complete` in `GET /onboarding/kyc/spec` — submissions without it stay at `incomplete`. |
| `identity.document_upload_id` | string | optional | *Deprecated* alias for `document_upload_key`. New clients should use `document_upload_key`. |
| `selfie` | object | optional | See below |
| `selfie.upload_key` | string | yes (if `selfie` sent) | File-service key with extension ∈ `jpg|jpeg|png`. Updates the **most recent** `kyc_submissions` row's `selfie_upload_key`. If no submission exists yet, returns 422 `identity_required_first`. |

> **Setting `handle` here also stamps `users.handle_changed_at`**, so the 30-day cooldown for `POST /me/handle` engages from this point onward.

### Responses

#### 200 OK

```json
{
  "data": {
    "kyc_progress": {
      "completed_items": ["full_name", "handle", "occupation", "interests", "identity"],
      "total_items": 9,
      "percent": 56
    }
  }
}
```

> `total_items` reflects the count of currently `enabled && required` items in `kyc.professional_items`. Default seeded value is 9 (after `selfie` was added in 0061); admins can change it.

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
      "identity.type": ["Invalid enum value. Expected 'nin' | 'bvn' | 'passport' | 'drivers_license', received 'foo'"],
      "identity.document_upload_key": ["Invalid upload key (expected <uuid>.<ext>)."]
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

#### 422 Unprocessable Entity — selfie sent without prior identity

```json
{
  "error": {
    "code": "identity_required_first",
    "message": "Request failed",
    "field_errors": { "selfie": ["Submit identity verification before adding a selfie."] }
  }
}
```

Trigger: body includes `selfie` but the user has no `kyc_submissions` row yet. Submit `identity` first (a single PATCH can include both fields).

#### 429 Too Many Requests — global IP rate limit

```json
{ "error": { "code": "rate_limited", "message": "Too many requests, please try again later" } }
```

**Side-effects:**
- Updates supplied `users` columns (`full_name`, `handle`, `occupation`, `description`, `interests`).
- When `handle` is provided AND differs from current value, also stamps `users.handle_changed_at = now()`.
- When `identity` is supplied, inserts a new row into `kyc_submissions` with `status = 'pending_review'` and `document_upload_id = <document_upload_key>` (legacy column name, new value semantic). Each call with `identity` creates a new audit-trail row (no upsert).
- When `selfie` is supplied, **patches** `kyc_submissions.selfie_upload_key` on the user's most recent submission. Returns 422 `identity_required_first` if no submission exists. Selfie can be supplied alone (after identity), or in the same PATCH as identity.

---

## 6. GET `/api/v1/onboarding/handle/check?handle=<handle>`

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

## 7. POST `/api/v1/me/handle`

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

## 8. POST `/api/v1/onboarding/kyc/complete`

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
{
  "error": {
    "code": "kyc_incomplete",
    "message": "Request failed",
    "field_errors": {
      "incomplete_items": ["handle", "selfie"]
    }
  }
}
```

`field_errors.incomplete_items` lists the exact `kyc.{role}_items` keys that are still missing — the frontend can highlight just those tiles.

Trigger: any `enabled && required` item in `kyc.{role}_items` is incomplete. The default seeded set is:
- Client: `full_name`, `interests`.
- Professional: `full_name`, `handle`, `occupation`, `description`, `interests`, `bank_account`, `identity`, `selfie`, `rates`.

Admins can disable items or mark them optional via `PATCH /admin/config` — the completion check follows the live config.

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
Step 4  →  GET  /onboarding/kyc/spec                   200, items[] with values+complete
                — render one tile/modal per item; loop —
Step 5a →  PATCH /onboarding/kyc/client                  ⎫
                — or —                                   ⎬  …per-item save until all_complete
Step 5b →  PATCH /onboarding/kyc/professional            ⎪
           PUT  /me/bank-account       (profile API)     ⎪    bank_account
           POST /me/rates              (rates API)       ⎪    rates
                                                         ⎪
           // ID document + selfie photos ──────────────  ⎪
           GET  /get-upload-uri?ext=jpg (file service)   ⎪    → key + presigned PUT
           PUT  <presigned uri>          (file service)  ⎪    → bytes uploaded
           PATCH /onboarding/kyc/professional             ⎪
             { identity: { …, document_upload_key },     ⎪    identity
               selfie:   { upload_key } }                ⎭    selfie
Step 6  →  POST /onboarding/kyc/complete               200, kyc_status="approved"
                                                       OR 422 kyc_incomplete + missing keys
Step 7  →  GET  /onboarding/status                     200, step="complete"
```

> **Saves invalidate the spec.** Every save endpoint above invalidates the user's `kyc-spec` cache server-side; the frontend just refetches `/onboarding/kyc/spec` after each PATCH/PUT/POST and the affected tile turns green.

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

- `PATCH /onboarding/kyc/client` is naturally idempotent — re-sending the same body is safe.
- `PATCH /onboarding/kyc/professional` is **mostly** idempotent — except that each `identity` field creates a new `kyc_submissions` row (audit trail), and each `selfie` patches only the most recent row. Sending the same `identity` twice creates two submission rows; sending the same `selfie` twice is a true no-op.
- `POST /onboarding/role` is naturally idempotent for the same role.
- `POST /me/handle` is **not** safe to blind-retry: a successful response stamps cooldown; a retry will hit 429.
- `POST /onboarding/kyc/complete` re-stamps timestamps on each call but never re-rejects.

## What clients should i18n on

`error.code` is stable and should drive UI strings. `error.message` is a debug aid and may change. `field_errors` values currently come from Zod and are English-only — wrap them in a translation layer or display them only on dev builds. The `category_invalid` error (a 422 returned by `PATCH /me`, profile API) also includes `field_errors` and is the only non-`validation_error` code that does so consistently.
