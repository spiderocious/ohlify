# Profile API

> Base URL: `{API_BASE_URL}/api/v1`
> All requests require `Authorization: Bearer <jwt>`.
> Standard envelope: success → `{ "data": ... }`, error → `{ "error": { "code", "message", "field_errors? } }`.
> Errors common to every endpoint: `401 unauthorized`, `429 rate_limited` (with `Retry-After`).

---

## 1. `GET /me`

Returns the canonical user object for the logged-in user.

**Auth:** required.

**Response — 200**
```json
{
  "data": {
    "id": "u_01jx...",
    "role": "professional",
    "full_name": "Adedeji Bamidele",
    "email": "adedeji@gmail.com",
    "email_verified": true,
    "phone_number": "+2348012346789",
    "phone_verified": true,
    "handle": "seidu23",
    "share_slug": "seidu23-a1b2c3",
    "avatar_url": "avatars/u_01jx.../profile.jpg",
    "cover_photo_url": null,
    "occupation": "Software engineer",
    "description": "...",
    "interests": ["Technology"],
    "categories": ["developer"],
    "is_available": true,
    "rating": 0,
    "review_count": 0,
    "kyc_status": "approved",
    "created_at": "2026-04-25T10:00:00Z"
  }
}
```
- `avatar_url` is the file_key returned by `POST /me/avatar` — clients prepend the uploads CDN base URL.
- `cover_photo_url` is always `null` in this phase (not yet supported).
- `share_slug` derives from handle + a stable hash of user id.
- `rating` / `review_count` default to `0` until reviews aggregate ships.

**Errors:** `401 token_invalid` (user soft-deleted or gone).

---

## 2. `PATCH /me`

Partial update of editable profile fields.

**Auth:** required.

**Request** — strict body (extra keys rejected). All fields optional.
```json
{
  "full_name": "...",
  "description": "...",
  "occupation": "...",
  "interests": ["..."],
  "is_available": true,
  "categories": ["lawyer"]
}
```
- `is_available` and `categories` only allowed for professionals.
- `handle` cannot be changed here — use `POST /me/handle`.
- `email` / `phone_number` cannot be changed here — use the OTP-gated endpoints.

**Response — 200** — same shape as `GET /me`.

**Errors:**
| Status | code | When |
|---|---|---|
| 400 | `validation_error` | bad shape / value |
| 401 | `token_invalid` | user not found |
| 403 | `forbidden` | client tried to set `is_available` or `categories`, or `handle` differs |

**Side-effects:** updates the corresponding `users` columns.

---

## 3. `POST /me/email`

Two-step email change. **Step 1.** Caller must first request a sensitive-action OTP via `POST /me/sensitive-action/otp` with `action: "change_email"`. The OTP goes to the **current** email.

**Auth:** required.

**Request**
```json
{ "new_email": "new@example.com", "otp": "123456" }
```

**Response — 200**
```json
{ "data": { "email": "new@example.com", "email_verified": false } }
```

**Errors:**
| Status | code | When |
|---|---|---|
| 400 | `validation_error` | bad email/otp shape |
| 400 | `validation_error` | new_email equals current email |
| 401 | `invalid_otp` | OTP missing or wrong |
| 401 | `token_invalid` | user not found |
| 409 | `email_exists` | new_email already taken |

**Side-effects:**
- updates `users.email`, sets `users.email_verified_at = NULL`.
- generates a new 6-digit OTP, stores SHA-256 hash in Redis at `email-verify:{userId}` (TTL 10 min), sends it via Resend to the **new** address.

---

## 4. `POST /me/email/verify`

Confirms the new email address with the OTP sent to it.

**Auth:** required.

**Request**
```json
{ "otp": "123456" }
```

**Response — 204** (empty body).

**Errors:**
| Status | code | When |
|---|---|---|
| 400 | `validation_error` | bad otp |
| 401 | `invalid_otp` | OTP missing/expired/wrong |

**Side-effects:** sets `users.email_verified_at = now()`, deletes Redis key.

---

## 5. `POST /me/phone`

Phone change, mirrors §3 with SMS channel. **Step 1.** Caller must first request a sensitive-action OTP with `action: "change_phone"`.

**Auth:** required.

**Request**
```json
{ "new_phone_number": "+2348012345678", "otp": "123456" }
```

**Response — 200**
```json
{ "data": { "phone_number": "+2348012345678", "phone_verified": false } }
```

**Errors:**
| Status | code | When |
|---|---|---|
| 400 | `validation_error` | bad shape / phone not E.164 / equals current |
| 401 | `invalid_otp` | OTP missing/wrong |
| 401 | `token_invalid` | user not found |
| 409 | `phone_exists` | new phone already taken |

**Side-effects:**
- updates `users.phone_number`, sets `users.phone_verified_at = NULL`.
- generates a new 6-digit OTP, stores SHA-256 hash in Redis at `phone-verify:{userId}` (TTL 10 min).
- **SMS delivery is currently a no-op stub** — OTP is logged for development; real SMS provider wires in later.

---

## 6. `POST /me/phone/verify`

Confirms the new phone with the OTP sent to it. Identical shape to §4.

**Response — 204**.

**Errors:** as §4 (`invalid_otp` / `validation_error`).

**Side-effects:** sets `users.phone_verified_at = now()`, deletes Redis key.

---

## 7. `GET /me/notification-preferences`

**Auth:** required.

**Response — 200**
```json
{
  "data": {
    "sms":   { "enabled": false, "updated_at": "2026-04-25T..." },
    "email": { "enabled": true,  "updated_at": "2026-04-25T..." },
    "push":  { "enabled": true,  "updated_at": "2026-04-25T..." }
  }
}
```
Defaults: sms=off, email=on, push=on. Row is created lazily on first read.

---

## 8. `PATCH /me/notification-preferences`

**Auth:** required.

**Request** — strict, any subset of channels:
```json
{ "sms": true, "email": false }
```

**Response — 200** — same shape as §7.

**Side-effects:** updates only the channels supplied; bumps the corresponding `*_updated_at` column.

---

## 9. `DELETE /me`

Soft-deletes the account. **Step 1.** Caller must first request a sensitive-action OTP with `action: "delete_account"`.

**Auth:** required.

**Request**
```json
{ "otp": "123456", "confirm": true }
```

**Response — 202**
```json
{ "data": { "deletion_scheduled_for": "2026-05-25T..." } }
```
30-day recovery window. Hard purge happens via worker cron (not yet implemented).

**Errors:**
| Status | code | When |
|---|---|---|
| 400 | `validation_error` | otp / confirm bad shape |
| 400 | `confirmation_required` | `confirm` not `true` |
| 401 | `invalid_otp` | OTP missing/wrong |
| 401 | `token_invalid` | user not found |

**Side-effects:**
- sets `users.deleted_at = now()`, `users.status = 'deleted'`.
- anonymizes `email` → `deleted+<id>@ohlify.invalid` and `phone_number` → placeholder, freeing UNIQUE constraints.
- revokes all `auth_sessions` for the user.

---

## 10. `GET /me/bank-account`

**Auth:** required.

**Response — 200** (when set)
```json
{
  "data": {
    "account_number": "9654519113",
    "account_number_masked": "***9113",
    "bank_code": "058",
    "bank_name": "Moniepoint MFB",
    "account_name": "Adekunle Ifeanyi Musa",
    "added_at": "2026-04-25T..."
  }
}
```
or `{ "data": null }` if unset.

---

## 11. `PUT /me/bank-account`

Create or replace the user's bank account.

**Auth:** required.

**Request**
```json
{ "account_number": "0123456789", "bank_code": "058" }
```
- `account_number`: 8–12 digits.
- `bank_code` must exist in the `banks` table and be active.

**Response — 200** — same shape as §10.

**Errors:**
| Status | code | When |
|---|---|---|
| 400 | `validation_error` | bad shape |
| 401 | `token_invalid` | user not found |
| 422 | `bank_not_found` | `bank_code` unknown or inactive |
| 422 | `kyc_incomplete` | user has no `full_name` set yet (cannot derive `account_name`) |

**MVP note:** Paystack name resolve is deferred. `account_name` is currently set to the user's `full_name`. Real implementation will call Paystack `/bank/resolve` and 422 with `account_name_mismatch` on inequality.

**Side-effects:** upserts a row in `bank_accounts` keyed by `user_id`.

---

## 12. `DELETE /me/bank-account`

**Auth:** required.

**Response — 204**.

**Side-effects:** deletes the user's row from `bank_accounts` (no-op if absent).

---

## 13. `POST /me/avatar`

Sets the avatar to a `file_key` returned by the uploads microservice.

**Auth:** required.

**Request**
```json
{ "file_key": "avatars/u_01jx.../profile.jpg" }
```
- `file_key`: 1–512 chars, `^[A-Za-z0-9._/-]+$`. No URL schemes, no query strings.

**Response — 200**
```json
{ "data": { "avatar_url": "avatars/u_01jx.../profile.jpg" } }
```

**Errors:**
| Status | code | When |
|---|---|---|
| 400 | `validation_error` | file_key fails regex / shape |
| 401 | `token_invalid` | user not found |

**Side-effects:** updates `users.avatar_url` to the supplied file_key.

---

## 14. `DELETE /me/avatar`

Clears the avatar.

**Auth:** required.

**Response — 204**.

**Side-effects:** sets `users.avatar_url = NULL`.

---

## 15. Errors reference

All error responses follow the standard envelope:
```json
{ "error": { "code": "<snake_case>", "message": "<human readable>", "field_errors": { "...": ["..."] } } }
```
`field_errors` is only present on `validation_error` (400) responses.
