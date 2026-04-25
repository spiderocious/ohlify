# Onboarding API

> Base URL: `{API_BASE_URL}/api/v1`
> All requests require `Authorization: Bearer <jwt>` unless noted otherwise.
> Standard envelope: success → `{ "data": ... }`, error → `{ "error": { "code", "message", "field_errors? } }`.
> Errors common to every endpoint: `401 unauthorized`, `429 rate_limited` (with `Retry-After`).

---

## 1. `GET /onboarding/status`

Returns the current onboarding step + KYC progress.

**Auth:** required.

**Response — 200**
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
- `step` ∈ `role_selection` | `client_kyc` | `professional_kyc` | `complete`.
- `total_items` is **3** for clients, **8** for professionals.
- For pros, items: `full_name, handle, occupation, description, interests, bank_account, identity, rates`.
- For clients, items: `full_name, description, interests`.
- `bank_account`, `identity`, and `rates` are inferred from sibling endpoints (PUT /me/bank-account, the latest kyc_submissions row, and any active row in professional_rates).

**Errors:** `401 token_invalid` (user gone after token issue).

**Side-effects:** none.

---

## 2. `POST /onboarding/role`

Sets the user's role. Once role is "confirmed" (any KYC progress made or `full_name` set), it cannot change.

**Auth:** required.

**Request**
```json
{ "role": "professional" }
```

**Response — 200**
```json
{
  "data": {
    "role": "professional",
    "next_step": "professional_kyc"
  }
}
```

**Errors:**
| Status | code | When |
|---|---|---|
| 400 | `validation_error` | `role` missing or not one of `client`/`professional` |
| 401 | `token_invalid` | user not found |
| 409 | `role_already_set` | role already confirmed via prior progress |

**Side-effects:** updates `users.role`.

---

## 3. `PATCH /onboarding/kyc/client`

Incremental save of client KYC fields.

**Auth:** required (role must be `client`).

**Request** — all fields optional, body is strict (extra keys rejected).
```json
{
  "full_name": "Adedeji Bamidele",
  "description": "short bio",
  "interests": ["Technology", "Relationship"]
}
```

**Response — 200**
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

**Errors:**
| Status | code | When |
|---|---|---|
| 400 | `validation_error` | bad shape |
| 401 | `token_invalid` | user not found |
| 403 | `role_mismatch` | user.role !== `client` |

**Side-effects:** updates `users` columns `full_name` / `description` / `interests`.

---

## 4. `PATCH /onboarding/kyc/professional`

Incremental save of professional KYC fields. **Bank account and rates use their own endpoints** (`PUT /me/bank-account`, `POST /me/rates`).

**Auth:** required (role must be `professional`).

**Request** — all fields optional, body is strict.
```json
{
  "full_name": "...",
  "handle": "seidu23",
  "occupation": "Senior sales manager",
  "description": "...",
  "interests": ["Technology"],
  "identity": {
    "type": "nin",
    "number": "12345678901",
    "document_upload_id": "kyc/u_abc/01jx..."
  }
}
```
- `handle`: lowercase letters/digits/underscore, 3–24 chars.
- `identity.type` ∈ `nin` | `bvn` | `passport` | `drivers_license`.
- `identity.document_upload_id` is the file_key returned by the uploads microservice (optional for MVP).

**Response — 200**
```json
{
  "data": {
    "kyc_progress": {
      "completed_items": ["full_name", "handle", "occupation", "interests"],
      "total_items": 8,
      "percent": 50
    }
  }
}
```

**Errors:**
| Status | code | When |
|---|---|---|
| 400 | `validation_error` | bad shape |
| 400 | `handle_invalid_format` | handle fails regex |
| 400 | `handle_reserved` | handle is on the reserved list |
| 401 | `token_invalid` | user not found |
| 403 | `role_mismatch` | user.role !== `professional` |
| 409 | `handle_taken` | handle owned by another user / redirect-active |

**Side-effects:** updates `users` columns; inserts a `kyc_submissions` row when `identity` is supplied (status `pending_review`).

---

## 5. `GET /onboarding/handle/check?handle=<handle>`

Real-time handle availability check (debounced from client).

**Auth:** required. Per-user rate limit 60/min.

**Query:** `handle=<lowercased>`.

**Response — 200**

Available:
```json
{ "data": { "available": true, "normalized": "seidu23" } }
```

Unavailable:
```json
{
  "data": {
    "available": false,
    "reason": "taken",
    "suggestions": ["seidu23_42", "seidu2342", "seidu23_701"]
  }
}
```
`reason` ∈ `taken` | `invalid_format` | `reserved`.

**Caching:** server caches positive answers in Redis 60s under `handle:check:{handle}`.

**Side-effects:** none.

---

## 6. `POST /me/handle`

Post-onboarding handle rename. 30-day cooldown enforced via `users.handle_changed_at`.

**Auth:** required (role must be `professional`).

**Request**
```json
{ "handle": "new_handle" }
```

**Response — 200**
```json
{
  "data": {
    "handle": "new_handle",
    "share_url": "https://ohlify.com/new_handle",
    "previous_handle_redirects_until": "2026-07-24T..."
  }
}
```

**Errors:**
| Status | code | When |
|---|---|---|
| 400 | `validation_error` / `handle_invalid_format` / `handle_reserved` | bad input |
| 401 | `token_invalid` | user not found |
| 403 | `role_mismatch` | non-professional |
| 409 | `handle_taken` | already owned |
| 429 | `handle_cooldown` | within 30-day cooldown — returns `Retry-After` seconds |

**Side-effects:** updates `users.handle` and `users.handle_changed_at`. Inserts a `handle_redirects` row for the previous handle (90-day expiry).

---

## 7. `POST /onboarding/kyc/complete`

Submits KYC for review or auto-approves it (controlled by `kyc.auto_approve` platform config; MVP = true).

**Auth:** required.

**Request:** empty body.

**Response — 200**
```json
{
  "data": {
    "kyc_status": "approved",
    "next_step": "complete"
  }
}
```
`kyc_status` ∈ `approved` | `pending_review`.

**Errors:**
| Status | code | When |
|---|---|---|
| 401 | `token_invalid` | user not found |
| 422 | `kyc_incomplete` | required items still missing |

**Side-effects:** sets `users.kyc_status`, `users.kyc_submitted_at`, and `users.kyc_reviewed_at` (when auto-approved).

---

## 8. Errors reference

All error responses follow the standard envelope:
```json
{ "error": { "code": "<snake_case>", "message": "<human readable>", "field_errors": { "...": ["..."] } } }
```
`field_errors` is only present on `validation_error` (400) responses.
