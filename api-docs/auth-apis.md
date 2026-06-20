# Auth API Reference

> Backend service for ohlify. All endpoints share a uniform response envelope, error model, headers, and rate-limit behavior. Read the **Common conventions** section once, then jump to the endpoint of interest.

**Base URL:** `https://api.ohlify.com` (prod) · `http://localhost:8082` (local)
**Version prefix:** `/api/v1`

---

## Table of Contents

| # | Method | Path | Auth | Purpose |
|---|---|---|---|---|
| 1 | POST | `/api/v1/auth/register/initiate` | none | Start a registration; create a registration token + send OTP |
| 2 | POST | `/api/v1/auth/register/set-password` | none + token | Set the password on a pending registration token |
| 3 | POST | `/api/v1/auth/register/verify` | none + token | Verify OTP and create the user account |
| 4 | POST | `/api/v1/auth/register/resend-otp` | none + token | Resend the registration OTP |
| 5 | POST | `/api/v1/auth/login` | none | Email + password login; returns access + refresh tokens |
| 6 | POST | `/api/v1/auth/refresh` | none + refresh token | Rotate refresh token; mint new access token |
| 7 | POST | `/api/v1/auth/logout` | Bearer | Revoke a refresh token |
| 8 | POST | `/api/v1/auth/forgot-password/initiate` | none | Send password reset OTP (always 200, no email enumeration) |
| 9 | POST | `/api/v1/auth/forgot-password/verify-otp` | none | Verify forgot-password OTP, mint short-lived reset token |
| 10 | POST | `/api/v1/auth/forgot-password/reset` | none + reset token | Set a new password with the reset token |
| 11 | POST | `/api/v1/me/password` | Bearer + sensitive OTP | Change current user's password |
| 12 | POST | `/api/v1/me/sensitive-action/otp` | Bearer | Request OTP for a sensitive account action |

---

## Common conventions

### 1. Response envelope

Every response — success or error — uses one of these two shapes:

**Success**
```json
{
  "data": { /* endpoint-specific payload */ },
  "meta": { /* optional, only on paginated/aggregated endpoints */ }
}
```

**Error** — flat envelope (no `error` wrapper). See `docs/error-envelope-redesign.md`.
```json
{
  "errorCode": 1000,
  "errorMessage": "Human-readable, displayable message",
  "reason": "snake_case_reason",
  "fieldErrors": { "field": ["msg"] }
}
```

- `reason` — stable snake_case identity. **Key UI/i18n off `reason`**, never the human `errorMessage`.
- `errorCode` — numeric severity band 1000–1009 (last digit = severity: `1000` body-validation … `1009` server). For measurement/alerting.
- `errorMessage` — resolved, user-displayable text.
- `fieldErrors` — present only on validation failures (`reason: "validation_error"`), and carries **one field at a time** (the first invalid field). Fix it, resubmit, the next one appears.

> Note: some inline examples below still show the legacy `{ "error": { "code", "message" } }` shape. The live API now returns the flat shape above for every error; the catalog of `reason` values is unchanged.

### 2. Error code catalog

Every value below is a snake_case string returned as `reason`. UI/i18n must map them — never key off the human `errorMessage`.

| Code | Meaning | Typical HTTP |
|---|---|---|
| `validation_error` | Request body failed Zod validation | 400 |
| `invalid_otp` | OTP wrong, missing, or no active OTP record | 400 / 401 |
| `otp_expired` | OTP record exists but past `expires_at` | 400 |
| `otp_max_attempts` | OTP attempted too many times | 429 |
| `token_invalid` | Registration / refresh / reset token unknown, expired, or already consumed | 401 / 404 / 409 |
| `credential_not_set` | `register/verify` called before `register/set-password` | 400 |
| `email_exists` | Email already belongs to a registered user | 409 |
| `phone_exists` | Phone number already belongs to a registered user | 409 |
| `invalid_credentials` | Wrong email/password (login) or wrong current password (change) | 401 |
| `account_locked` | Per-email lockout after 5 failed logins (15-min window) | 401 |
| `account_suspended` | User row has `status='suspended'` | 403 |
| `account_blocked` | User row has `status='blocked'` or `status='deleted'` | 403 |
| `session_revoked` | Refresh token reuse detected, or session already revoked | 401 |
| `session_expired` | Refresh session past `expires_at` (30 days) | 401 |
| `rate_limited` | IP/route/service-level rate limit hit | 429 |
| `unauthorized` | Bearer header missing/malformed/invalid | 401 |
| `not_found` | Route doesn't exist | 404 |
| `internal` | Unhandled exception caught by the error handler | 500 |

### 3. Headers

**On every request you may send:**

| Header | When | Notes |
|---|---|---|
| `Content-Type: application/json` | All POSTs with a body | Required for JSON parsing |
| `Authorization: Bearer <jwt>` | Endpoints marked `Bearer` | HS256 access token, 15-min TTL |
| `Idempotency-Key: <uuid>` | Optional, currently ignored on auth routes | Reserved for future use |
| `User-Agent` | Optional | Recorded on session row for /sessions UI |
| `Origin` | Browsers send automatically | Must match `WEB_BASE_URL` env or CORS rejects |

**Headers you receive on every response:**

| Header | Meaning |
|---|---|
| `x-request-id` | ULID for log correlation. Include in bug reports. |
| `RateLimit-Policy` | `120;w=60` — global limit |
| `RateLimit-Limit` | Max requests in current global window |
| `RateLimit-Remaining` | Requests left before global 429 |
| `RateLimit-Reset` | Seconds until the global window resets |
| `X-RateLimit-Remaining` | Per-route rate limit remaining (only set when route has its own limit) |
| `Retry-After` | Seconds — present on **every** 429 and on `account_locked` 401 |
| Standard security headers | `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `X-Frame-Options: SAMEORIGIN`, full CSP, `Referrer-Policy: no-referrer`, etc. (helmet defaults) |

### 4. Rate limits

Three layers stack on top of each other. Whichever fires first wins.

1. **Global rate limit** — 120 requests / 60 seconds, per IP, all routes. Returns `429 rate_limited`.
2. **Per-route IP rate limit** — set per endpoint (see each spec below). Returns `429 rate_limited` with `X-RateLimit-Remaining` and `Retry-After`.
3. **Service-level rate limit** — business-logic limits inside the service (login lockout, OTP resend ceiling, sensitive-OTP ceiling). Returns `429 rate_limited` with `Retry-After`, or `401 account_locked` with `Retry-After`.

### 5. Validation rules (referenced throughout)

- **email** — RFC 5322 valid format. Validated by Zod `z.string().email()`. Stored case-insensitive (`CITEXT`).
- **phone** — E.164 format: `^\+[1-9]\d{7,14}$`. Example: `+2348012345678`.
- **otp** — Exactly 6 digits, numeric only: `^\d{6}$`.
- **password** — 8+ chars, must contain at least one uppercase, one lowercase, one digit, one special char (`[^A-Za-z0-9]`).
- **registration_token** — Opaque hex string (~52 chars), hashed server-side with sha256.
- **refresh_token** — 32-byte random hex (64 chars), hashed server-side with sha256.
- **reset_token** — 32-byte random hex (64 chars), hashed server-side with sha256.

### 6. CORS

Only the origin in `env.WEB_BASE_URL` is allowed. `credentials: true`. Methods: `GET, HEAD, PUT, PATCH, POST, DELETE`. Preflights respond `204`.

### 7. Status codes summary

- `200` — success on read/idempotent action
- `201` — success and a resource was created (`register/initiate`, `register/verify`)
- `400` — validation failed or business precondition not met (e.g. `credential_not_set`)
- `401` — auth failed: missing/bad bearer, invalid OTP on protected ops, bad refresh, locked account
- `403` — account suspended/blocked
- `404` — route not found OR pending token not found (registration tokens use 404 for "not found / consumed / expired" to make enumeration harder)
- `409` — conflict: email/phone already taken, registration token already consumed
- `429` — rate-limited (any layer)
- `500` — unhandled exception

---

# Endpoint specifications

---

## 1. POST `/api/v1/auth/register/initiate`

Start a new registration. Creates a `registration_tokens` row, generates a 6-digit OTP, stores its sha256 hash in Redis (key `otp:{sha256(token)}`, 10-min TTL) and in the `otp_codes` table, and dispatches the OTP via the chosen channel.

**Auth:** none
**Per-route rate limit:** 10 / 15 min per IP
**Idempotency:** none (each call creates a new token)

### Request

| Header | Required | Value |
|---|---|---|
| `Content-Type` | yes | `application/json` |

**Body — JSON**

```json
{
  "email": "user@example.com",
  "phone": "+2348012345678",
  "channel": "email"
}
```

| Field | Type | Required | Constraint |
|---|---|---|---|
| `email` | string | yes | RFC 5322 email |
| `phone` | string | yes | E.164 |
| `channel` | enum | yes | `"email"` or `"sms"` — destination for the OTP |

### Responses

#### 201 Created — registration started

```json
{
  "data": {
    "registration_token": "01kq2nzjkvw6kgnwdj5mkjb4hq01kq2nzjkvbp2dbqe7h3w35kpp",
    "otp_destination_masked": "u***@example.com",
    "resend_available_at": "2026-04-25T16:02:22.572Z"
  }
}
```

- `registration_token` — opaque token to use in subsequent steps. Treat as a secret. Expires in 30 minutes.
- `otp_destination_masked` — UI hint. For `email` channel: `"<first-char>***@<domain>"`. For `sms` channel: `"<first-4-digits>***<last-2>"`.
- `resend_available_at` — ISO 8601. The earliest moment `register/resend-otp` will succeed (60s cooldown).

#### 400 Bad Request — validation failed

Trigger: invalid email format, non-E.164 phone, channel not in enum, missing field.

```json
{
  "error": {
    "code": "validation_error",
    "message": "Validation failed",
    "field_errors": {
      "email": ["Invalid email address"],
      "phone": ["Phone number must be in E.164 format (e.g. +2348012345678)"],
      "channel": ["Invalid enum value. Expected 'email' | 'sms', received 'whatsapp'"]
    }
  }
}
```

#### 409 Conflict — email already registered

```json
{ "error": { "code": "email_exists", "message": "Request failed" } }
```

#### 409 Conflict — phone already registered

```json
{ "error": { "code": "phone_exists", "message": "Request failed" } }
```

#### 429 Too Many Requests — IP rate limit

Headers: `Retry-After: <seconds>`, `X-RateLimit-Remaining: 0`.

```json
{ "error": { "code": "rate_limited", "message": "Too many requests, please try again later" } }
```

---

## 2. POST `/api/v1/auth/register/set-password`

Sets the password for a pending registration token. Must be called between `register/initiate` and `register/verify`.

**Auth:** none — gated by possession of the `registration_token`
**Per-route rate limit:** 10 / 15 min per IP

### Request

```json
{
  "registration_token": "01kq2nzjkvw6kgnwdj5mkjb4hq01kq2nzjkvbp2dbqe7h3w35kpp",
  "password": "Password123!"
}
```

| Field | Type | Required | Constraint |
|---|---|---|---|
| `registration_token` | string | yes | The token from `register/initiate` |
| `password` | string | yes | 8+ chars, mixed case, digit, special char |

### Responses

#### 200 OK

```json
{ "data": null }
```

#### 400 Bad Request — validation

```json
{
  "error": {
    "code": "validation_error",
    "message": "Validation failed",
    "field_errors": {
      "password": [
        "Password must be at least 8 characters",
        "Password must contain at least one uppercase letter"
      ]
    }
  }
}
```

#### 404 Not Found — token unknown / expired / consumed

```json
{ "error": { "code": "token_invalid", "message": "Request failed" } }
```

#### 429 Too Many Requests — IP rate limit (same shape as endpoint 1)

---

## 3. POST `/api/v1/auth/register/verify`

Verify the OTP, consume the registration token, create the user, mint and return access + refresh tokens.

**Auth:** none — gated by possession of `registration_token` AND a valid OTP
**Per-route rate limit:** 20 / 15 min per IP
**OTP attempts:** 5 per OTP record (DB column `max_attempts`)

### Request

```json
{
  "registration_token": "01kq2nzjkvw6kgnwdj5mkjb4hq01kq2nzjkvbp2dbqe7h3w35kpp",
  "otp": "123456"
}
```

| Field | Type | Required | Constraint |
|---|---|---|---|
| `registration_token` | string | yes | From `register/initiate` |
| `otp` | string | yes | Exactly 6 digits |

### Responses

#### 201 Created — user registered

```json
{
  "data": {
    "user": {
      "id": "u_01kq2pannnsm5xvbbrk6mw3eww",
      "email": "user@example.com",
      "role": "client"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "78ae5e4c4d24da5b0fb35283534aea31d23639b59e8bbc07a3986401ddefb8d7",
    "expires_in": 900,
    "onboarding_step": "profile"
  }
}
```

| Field | Type | Notes |
|---|---|---|
| `user.id` | string | ULID prefixed `u_` |
| `user.role` | enum | `"client"` (default) or `"professional"` |
| `access_token` | string | HS256 JWT, claims: `sub`, `role`, `jti`, `iat`, `exp` |
| `refresh_token` | string | 64-char hex, opaque |
| `expires_in` | int | Access token lifetime in seconds (always 900) |
| `onboarding_step` | enum | `"profile"` for fresh registration |

#### 400 Bad Request — validation

```json
{ "error": { "code": "validation_error", "message": "Validation failed",
  "field_errors": { "otp": ["OTP must be 6 digits"] } } }
```

#### 400 Bad Request — password not yet set

Trigger: `register/set-password` was never called for this token.

```json
{ "error": { "code": "credential_not_set", "message": "Request failed" } }
```

#### 400 Bad Request — wrong OTP (still has attempts left)

```json
{ "error": { "code": "invalid_otp", "message": "Request failed" } }
```

#### 400 Bad Request — OTP expired (10 min passed)

```json
{ "error": { "code": "otp_expired", "message": "Request failed" } }
```

#### 404 Not Found — registration token unknown / expired

```json
{ "error": { "code": "token_invalid", "message": "Request failed" } }
```

#### 409 Conflict — token already consumed (concurrent verify race)

```json
{ "error": { "code": "token_invalid", "message": "Request failed" } }
```

#### 429 Too Many Requests — OTP attempts exhausted (5 wrong attempts)

`Retry-After` not set on this code path — the token must be regenerated via resend or a new initiate.

```json
{ "error": { "code": "otp_max_attempts", "message": "Request failed" } }
```

#### 429 Too Many Requests — IP rate limit

```json
{ "error": { "code": "rate_limited", "message": "Too many requests, please try again later" } }
```

---

## 4. POST `/api/v1/auth/register/resend-otp`

Invalidate the previous OTP for a registration token, generate a new one, and dispatch via the original channel.

**Auth:** none — gated by `registration_token`
**Per-route rate limit:** 10 / 15 min per IP
**Service-level limit:** 5 resends per token per hour (Redis key `resend:{tokenHash}`, 1-hour TTL)

### Request

```json
{ "registration_token": "01kq2nzjkvw6kgnwdj5mkjb4hq01kq2nzjkvbp2dbqe7h3w35kpp" }
```

### Responses

#### 200 OK

```json
{
  "data": {
    "resend_available_at": "2026-04-25T16:08:40.186Z"
  }
}
```

#### 400 Bad Request — validation

```json
{ "error": { "code": "validation_error", "message": "Validation failed",
  "field_errors": { "registration_token": ["Required"] } } }
```

#### 404 Not Found — token unknown

```json
{ "error": { "code": "token_invalid", "message": "Request failed" } }
```

#### 429 Too Many Requests — service-level (>5 in last hour)

Headers: `Retry-After: <seconds-until-window-reset>`.

```json
{ "error": { "code": "rate_limited", "message": "Request failed" } }
```

#### 429 Too Many Requests — IP rate limit (same shape, different `Retry-After`)

---

## 5. POST `/api/v1/auth/login`

Email + password login. Returns access + refresh tokens. Does NOT short-circuit on unknown email — it still runs the argon2 dummy hash to keep timing constant.

**Auth:** none
**Per-route rate limit:** none (uses service-level instead)
**Service-level limits:**
- IP: 20 attempts / 15 min (Redis `login-ip:{ip}`)
- Email: 5 failed attempts / 15 min before locking the account (Redis `login-email:{email}` and `account-locked:{email}`)

### Request

```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

| Field | Type | Required | Constraint |
|---|---|---|---|
| `email` | string | yes | RFC 5322 |
| `password` | string | yes | min length 1 (no policy check on login — only on creation/change) |

### Responses

#### 200 OK — login success

```json
{
  "data": {
    "user": {
      "id": "u_01kq2pannnsm5xvbbrk6mw3eww",
      "email": "user@example.com",
      "role": "client",
      "full_name": "Ada Lovelace"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "0d7384aa6edf16a83030e44a5ff04b0abc5950a3087c4766396d3829a83deba1",
    "expires_in": 900,
    "onboarding_step": "complete"
  }
}
```

| Field | Type | Notes |
|---|---|---|
| `user.full_name` | string \| null | Null until profile is set |
| `onboarding_step` | enum | `"complete"` if `full_name` is set, else `"profile"` |

#### 400 Bad Request — validation (missing email/password, malformed email)

```json
{ "error": { "code": "validation_error", "message": "Validation failed",
  "field_errors": { "password": ["Required"] } } }
```

#### 401 Unauthorized — wrong credentials (still has attempts left)

```json
{ "error": { "code": "invalid_credentials", "message": "Request failed" } }
```

#### 401 Unauthorized — account locked (5th failure or pre-existing lock)

Headers: `Retry-After: 900` (or remaining lock TTL).

```json
{ "error": { "code": "account_locked", "message": "Request failed" } }
```

#### 403 Forbidden — account suspended

```json
{ "error": { "code": "account_suspended", "message": "Request failed" } }
```

#### 403 Forbidden — account blocked or deleted

```json
{ "error": { "code": "account_blocked", "message": "Request failed" } }
```

#### 429 Too Many Requests — IP login rate limit (>20 in 15 min)

Headers: `Retry-After: 900`.

```json
{ "error": { "code": "rate_limited", "message": "Request failed" } }
```

---

## 6. POST `/api/v1/auth/refresh`

Rotate the refresh token (one-time use). The presented token is revoked and a new pair is issued. **Reuse of an already-revoked token is treated as theft and revokes ALL sessions for the user.**

**Auth:** none — gated by possession of the refresh token
**Per-route rate limit:** none (refresh frequency is naturally limited by access token TTL of 15 min)

### Request

```json
{ "refresh_token": "0d7384aa6edf16a83030e44a5ff04b0abc5950a3087c4766396d3829a83deba1" }
```

### Responses

#### 200 OK — token rotated

```json
{
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "58abfeb67114c26ce4b64ab3cf7642977ac940ee82d7b29c72dc2bfb7b534048",
    "expires_in": 900
  }
}
```

#### 400 Bad Request — validation

```json
{ "error": { "code": "validation_error", "message": "Validation failed",
  "field_errors": { "refresh_token": ["Required"] } } }
```

#### 401 Unauthorized — token unknown

```json
{ "error": { "code": "token_invalid", "message": "Request failed" } }
```

#### 401 Unauthorized — token reuse detected

The presented token was already revoked. **Side effect:** all sessions for this user have been revoked.

```json
{ "error": { "code": "session_revoked", "message": "Request failed" } }
```

#### 401 Unauthorized — refresh session expired (>30 days old)

```json
{ "error": { "code": "session_expired", "message": "Request failed" } }
```

---

## 7. POST `/api/v1/auth/logout`

Revoke a refresh token. Idempotent — calling on an already-revoked or unknown token returns 200.

**Auth:** Bearer access token required
**Per-route rate limit:** none

### Request

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <access_token>` |
| `Content-Type` | yes | `application/json` |

```json
{ "refresh_token": "0d7384aa6edf16a83030e44a5ff04b0abc5950a3087c4766396d3829a83deba1" }
```

### Responses

#### 200 OK — always (even if token unknown or already revoked)

```json
{ "data": null }
```

The endpoint silently returns 200 if:
- The session doesn't exist
- The session belongs to a different user
- The session is already revoked

This is intentional — it makes logout safe to retry and prevents probing for valid token+user pairings.

#### 400 Bad Request — validation

```json
{ "error": { "code": "validation_error", "message": "Validation failed",
  "field_errors": { "refresh_token": ["Required"] } } }
```

#### 401 Unauthorized — missing/malformed Authorization header

```json
{ "error": { "code": "unauthorized", "message": "Missing or malformed Authorization header" } }
```

#### 401 Unauthorized — invalid or expired access token

```json
{ "error": { "code": "unauthorized", "message": "Invalid or expired token" } }
```

---

## 8. POST `/api/v1/auth/forgot-password/initiate`

Send a password-reset OTP. **Always returns 200**, regardless of whether the email is registered — this prevents email enumeration.

**Auth:** none
**Per-route rate limit:** 10 / 15 min per IP

### Request

```json
{ "email": "user@example.com" }
```

### Responses

#### 200 OK — request accepted (whether email exists or not)

```json
{ "data": null }
```

#### 400 Bad Request — validation

```json
{ "error": { "code": "validation_error", "message": "Validation failed",
  "field_errors": { "email": ["Invalid email address"] } } }
```

#### 429 Too Many Requests — IP rate limit

Headers: `Retry-After: <seconds>`.

```json
{ "error": { "code": "rate_limited", "message": "Too many requests, please try again later" } }
```

---

## 9. POST `/api/v1/auth/forgot-password/verify-otp`

Verify the password-reset OTP. On success, returns a short-lived `reset_token` (10-min TTL, single-use) that must be presented to `forgot-password/reset`.

**Auth:** none
**Per-route rate limit:** 10 / 15 min per IP
**OTP attempts:** 5 per OTP record

### Request

```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

### Responses

#### 200 OK — OTP verified

```json
{
  "data": {
    "reset_token": "39e9d94bde132333dec9f64241e04c6f46b79997556cc57d323735817e0e5889"
  }
}
```

`reset_token` — 64-char hex. Single use. Expires in 10 minutes.

#### 400 Bad Request — validation

```json
{ "error": { "code": "validation_error", "message": "Validation failed",
  "field_errors": { "otp": ["OTP must be 6 digits"] } } }
```

#### 400 Bad Request — wrong OTP

Also returned for any email that has no active OTP (e.g. unknown email — keeps enumeration impossible).

```json
{ "error": { "code": "invalid_otp", "message": "Request failed" } }
```

#### 400 Bad Request — OTP expired

```json
{ "error": { "code": "otp_expired", "message": "Request failed" } }
```

#### 429 Too Many Requests — OTP attempts exhausted

```json
{ "error": { "code": "otp_max_attempts", "message": "Request failed" } }
```

#### 429 Too Many Requests — IP rate limit

```json
{ "error": { "code": "rate_limited", "message": "Too many requests, please try again later" } }
```

---

## 10. POST `/api/v1/auth/forgot-password/reset`

Set a new password using the reset token. **Revokes all existing sessions** for the user on success.

**Auth:** none — gated by `reset_token`
**Per-route rate limit:** 10 / 15 min per IP

### Request

```json
{
  "reset_token": "39e9d94bde132333dec9f64241e04c6f46b79997556cc57d323735817e0e5889",
  "new_password": "NewPassword456!"
}
```

| Field | Type | Required | Constraint |
|---|---|---|---|
| `reset_token` | string | yes | From `forgot-password/verify-otp` |
| `new_password` | string | yes | 8+ chars, mixed case, digit, special char |

### Responses

#### 200 OK — password reset

```json
{ "data": null }
```

After this:
- The user's `password_hash` is replaced
- All `auth_sessions` rows for the user are marked `revoked_at = now()`
- The reset token is deleted (cannot be reused)

#### 400 Bad Request — validation

```json
{ "error": { "code": "validation_error", "message": "Validation failed",
  "field_errors": { "new_password": ["Password must contain at least one uppercase letter"] } } }
```

#### 401 Unauthorized — reset token unknown / expired / already used

```json
{ "error": { "code": "token_invalid", "message": "Request failed" } }
```

#### 429 Too Many Requests — IP rate limit (same shape as 8)

---

## 11. POST `/api/v1/me/password`

Change the authenticated user's password. Requires:
1. A valid Bearer access token
2. A current valid OTP previously requested via `/me/sensitive-action/otp` with `action: "change_password"`
3. The current password (anti-takeover safeguard)

**On success, all sessions for the user are revoked** — the user must log in again with the new password.

**Auth:** Bearer access token required
**Per-route rate limit:** 5 / 60 min per IP

### Request

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <access_token>` |
| `Content-Type` | yes | `application/json` |

```json
{
  "current_password": "OldPassword123!",
  "new_password": "NewPassword456!",
  "otp": "123456"
}
```

| Field | Type | Required | Constraint |
|---|---|---|---|
| `current_password` | string | yes | min length 1 |
| `new_password` | string | yes | 8+ chars, mixed case, digit, special char |
| `otp` | string | yes | 6 digits, from sensitive-action OTP |

### Responses

#### 200 OK — password changed

```json
{ "data": null }
```

#### 400 Bad Request — validation

```json
{ "error": { "code": "validation_error", "message": "Validation failed",
  "field_errors": { "new_password": ["Password must be at least 8 characters"] } } }
```

#### 401 Unauthorized — missing/malformed Authorization header

```json
{ "error": { "code": "unauthorized", "message": "Missing or malformed Authorization header" } }
```

#### 401 Unauthorized — invalid access token

```json
{ "error": { "code": "unauthorized", "message": "Invalid or expired token" } }
```

#### 401 Unauthorized — wrong OTP, or no OTP requested

```json
{ "error": { "code": "invalid_otp", "message": "Request failed" } }
```

> **Note:** the OTP is consumed regardless of whether `current_password` is correct or not — this prevents using the OTP as an oracle to probe the current password. If `current_password` was wrong, you must request a new OTP via `/me/sensitive-action/otp` before retrying.

#### 401 Unauthorized — wrong current password

```json
{ "error": { "code": "invalid_credentials", "message": "Request failed" } }
```

#### 401 Unauthorized — user no longer exists (token still valid but user deleted)

```json
{ "error": { "code": "token_invalid", "message": "Request failed" } }
```

#### 429 Too Many Requests — IP rate limit (5 / hour)

```json
{ "error": { "code": "rate_limited", "message": "Too many requests, please try again later" } }
```

---

## 12. POST `/api/v1/me/sensitive-action/otp`

Request a one-time OTP needed to perform a sensitive account action. The OTP is delivered via email (or SMS for `change_phone`) and stored in Redis under `sa-otp:{userId}:{action}` with a 10-minute TTL.

**Auth:** Bearer access token required
**Per-route rate limit:** none
**Service-level rate limit:** 5 OTP requests per (user, action) per hour

### Request

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <access_token>` |
| `Content-Type` | yes | `application/json` |

```json
{ "action": "change_password" }
```

| Field | Type | Required | Constraint |
|---|---|---|---|
| `action` | enum | yes | One of `"change_email"`, `"change_phone"`, `"change_password"`, `"delete_account"` |

### Delivery channel by action

| Action | Channel | Destination |
|---|---|---|
| `change_email` | email | current user email |
| `change_phone` | sms | current user phone |
| `change_password` | email | current user email |
| `delete_account` | email | current user email |

### Responses

#### 200 OK — OTP dispatched

```json
{
  "data": {
    "otp_destination_masked": "u***@example.com"
  }
}
```

For `change_phone`, the masked phone is returned: `"+234***78"`.

#### 400 Bad Request — validation

```json
{
  "error": {
    "code": "validation_error",
    "message": "Validation failed",
    "field_errors": {
      "action": ["Invalid enum value. Expected 'change_email' | 'change_phone' | 'change_password' | 'delete_account', received 'foo'"]
    }
  }
}
```

#### 401 Unauthorized — missing/malformed Authorization header

```json
{ "error": { "code": "unauthorized", "message": "Missing or malformed Authorization header" } }
```

#### 401 Unauthorized — invalid access token

```json
{ "error": { "code": "unauthorized", "message": "Invalid or expired token" } }
```

#### 401 Unauthorized — token references a deleted user

```json
{ "error": { "code": "token_invalid", "message": "Request failed" } }
```

#### 429 Too Many Requests — service-level (>5 OTP requests for this action/user/hour)

Headers: `Retry-After: <seconds-until-window-reset>`.

```json
{ "error": { "code": "rate_limited", "message": "Request failed" } }
```

---

# Cross-cutting concerns

## Token model

| Token | Format | Lifetime | Storage | How it's invalidated |
|---|---|---|---|---|
| Access (JWT) | HS256 JWT, claims `{sub, role, jti, iat, exp}` | 15 minutes | Stateless | Wait for expiry. No revocation list. |
| Refresh | 32-byte random hex (64 chars) | 30 days | `auth_sessions` row, sha256 hash | One-time use. Reuse → all sessions revoked. |
| Registration | hex string (~52 chars) | 30 minutes | `registration_tokens` row, sha256 hash | Consumed on `register/verify` |
| Password reset | 32-byte random hex (64 chars) | 10 minutes | Redis `pw-reset:{sha256}` | Consumed on `forgot-password/reset` |
| OTP | 6 digits | 10 minutes | Redis `otp:{...}` and `otp_codes` row | Consumed on success, after 5 wrong attempts, or on resend |
| Sensitive-action OTP | 6 digits | 10 minutes | Redis `sa-otp:{userId}:{action}` | Consumed on the action that uses it |

## Authentication flow (typical happy path)

```
Step 1  →  POST /auth/register/initiate         (201)  registration_token
Step 2  →  POST /auth/register/set-password     (200)
        OTP arrives via email/SMS
Step 3  →  POST /auth/register/verify           (201)  access + refresh
        ...later...
Step 4  →  POST /auth/login                     (200)  access + refresh   (wherever credentials are entered)
        ...every 15 min the access token expires...
Step 5  →  POST /auth/refresh                   (200)  new access + refresh   (rotates)
        ...user clicks logout...
Step 6  →  POST /auth/logout                    (200)  refresh revoked
```

## Forgot password flow

```
Step 1  →  POST /auth/forgot-password/initiate    (200, always)
        OTP arrives via email
Step 2  →  POST /auth/forgot-password/verify-otp  (200)  reset_token
Step 3  →  POST /auth/forgot-password/reset       (200)  password updated, all sessions revoked
        User logs in with new password.
```

## Change-password flow (authenticated)

```
Step 1  →  POST /me/sensitive-action/otp     (200)  body: { "action": "change_password" }
        OTP arrives via email
Step 2  →  POST /me/password                 (200)  password updated, all sessions revoked
        User must log in again with the new password.
```

## Idempotency & retries

Auth endpoints are **not** idempotent on the `Idempotency-Key` header — repeated calls create new tokens/sessions. Mobile clients should:

- Wait for the response or its timeout, then check via `/me` (where applicable) before retrying.
- Treat `register/initiate` as creating a new flow each time. Old tokens expire on their own.
- Treat `login` as creating a new session each time — old refresh tokens stay valid until their own 30-day expiry or explicit logout.

## What clients should i18n on

`error.code` is stable and should drive UI strings. `error.message` is a debug aid and may change. `field_errors[<field>]` messages currently come straight from Zod and are English-only — wrap them in a translation layer or display them only on dev builds.
