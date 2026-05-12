# Rates API Reference

> Backend service for ohlify. Rates endpoints manage a professional's call pricing — duration × call_type → price_kobo. **Professional-only.** Clients (role=client) get `403 forbidden` on every endpoint. All endpoints require a Bearer access token. Read **Common conventions** in `onboarding-apis.md` once, then jump to the endpoint of interest.

**Base URL:** `https://api.ohlify.com` (prod) · `http://localhost:8082` (local)
**Version prefix:** `/api/v1`

---

## Table of Contents

| # | Method | Path | Auth | Purpose |
|---|---|---|---|---|
| 1 | GET | `/api/v1/me/rates` | Bearer + role=professional | List the caller's active rates |
| 2 | POST | `/api/v1/me/rates` | Bearer + role=professional | Create a rate |
| 3 | PATCH | `/api/v1/me/rates/:id` | Bearer + role=professional | Edit a rate (any field) |
| 4 | DELETE | `/api/v1/me/rates/:id` | Bearer + role=professional | Soft-delete a rate |

> **Counts toward pro KYC:** the presence of any active row in `professional_rates` for this user is what flips the `rates` item to "completed" in `GET /onboarding/status`. Pros must add at least one rate before `POST /onboarding/kyc/complete` will succeed (returns `422 kyc_incomplete` otherwise).

---

## Domain rules

A **rate** is a unique tuple `(user_id, call_type, duration_minutes)`:

- `call_type` must be one of the platform-allowed values. Default: `["audio", "video"]`. The closed type union (`audio` | `video`) at the wire level is enforced by zod; the live config narrows further at runtime — admins can disable `video` (or `audio`) without a deploy and the create/update endpoints will reject the disabled value with `422 value_out_of_range` and `field_errors.call_type`.
- `duration_minutes` must be one of the platform-allowed values. Default: `[5, 10, 15, 20, 25, 30, 45, 60]`.
- `price_kobo` must be between `min_kobo` and `max_kobo` inclusive. Default: `50_000` (₦500) → `50_000_000` (₦500k).
- A pro cannot have two active rates with the same `(call_type, duration_minutes)` shape — returns `409 conflict`.
- Soft-delete: `DELETE /me/rates/:id` sets `deleted_at`; the row remains for audit but stops counting toward KYC and stops appearing in `GET /me/rates`.

All four config values are admin-editable via `platform_config` rows and are mirrored as defaults in [src/lib/config/platform-config.service.ts](apps/backend/src/lib/config/platform-config.service.ts). All four are `is_public = TRUE`, so the customer-web reads them directly via `GET /platform-config/public` to populate dropdowns and show min/max hints on the price field — see "Frontend consumption" below.

---

## 1. `GET /api/v1/me/rates`

Lists the caller's active (not soft-deleted) rates, sorted by `call_type` then `duration_minutes`.

**Response — 200**
```json
{
  "data": [
    {
      "id": "rate_01jx...",
      "call_type": "audio",
      "duration_minutes": 15,
      "price_kobo": 1500000,
      "currency": "NGN"
    },
    {
      "id": "rate_01jy...",
      "call_type": "video",
      "duration_minutes": 30,
      "price_kobo": 5000000,
      "currency": "NGN"
    }
  ]
}
```

Empty list returns `{ "data": [] }`, status 200.

**Errors**
| Status | code | When |
|---|---|---|
| 401 | `unauthorized` | Bearer missing/invalid |
| 403 | `forbidden` | Caller's role is `client` |
| 429 | `rate_limited` | Global rate limit |

**Notes**
- `price_kobo` is serialized as a JSON number. Safe up to 2^53 (₦90 trillion); well above our `max_kobo` ceiling.
- `currency` is always `NGN` for v1.
- This endpoint is the source of truth for the rates picker on the schedule screen — no other endpoint duplicates it.

---

## 2. `POST /api/v1/me/rates`

Creates a new rate. Returns the created rate.

**Per-user rate limit:** 30 requests / 60 minutes.

**Request**
```json
{
  "call_type": "audio",
  "duration_minutes": 15,
  "price_kobo": 1500000
}
```

All three fields required. Body is strict (extra keys → 400).

**Response — 201**
```json
{
  "data": {
    "id": "rate_01jx...",
    "call_type": "audio",
    "duration_minutes": 15,
    "price_kobo": 1500000,
    "currency": "NGN"
  }
}
```

**Errors**
| Status | code | When | Includes `field_errors`? |
|---|---|---|---|
| 400 | `validation_error` | Bad shape (missing field, wrong type, extra key) | yes |
| 401 | `unauthorized` | Bearer missing/invalid | no |
| 403 | `forbidden` | Caller's role is `client` | no |
| 409 | `conflict` | Pro already has an active rate with this `(call_type, duration_minutes)` | no |
| 422 | `value_out_of_range` | `call_type` not in `rates.allowed_call_types` | yes — `field_errors.call_type` |
| 422 | `value_out_of_range` | `duration_minutes` not in allowed set | yes — `field_errors.duration_minutes` |
| 422 | `value_out_of_range` | `price_kobo` outside `[min_kobo, max_kobo]` | yes — `field_errors.price_kobo` |
| 429 | `rate_limited` | Per-user (30/60min) or global limit | no |

> **400 vs 422:** `validation_error` (400) means the request shape is wrong (missing/extra/wrong-type field). `value_out_of_range` (422) means the shape is correct but a value violates a business policy (e.g. duration not allowed, price outside bounds). Frontends can branch on `code` alone — no need to inspect HTTP status.

**Field-error message examples**

```json
{
  "error": {
    "code": "value_out_of_range",
    "message": "Request failed",
    "field_errors": {
      "call_type": ["call_type must be one of: audio, video"]
    }
  }
}
```

```json
{
  "error": {
    "code": "value_out_of_range",
    "message": "Request failed",
    "field_errors": {
      "duration_minutes": ["duration_minutes must be one of: 5, 10, 15, 20, 25, 30, 45, 60"]
    }
  }
}
```

```json
{
  "error": {
    "code": "value_out_of_range",
    "message": "Request failed",
    "field_errors": {
      "price_kobo": ["price_kobo must be between 50000 and 50000000"]
    }
  }
}
```

**Side-effects**
- Inserts a row in `professional_rates`.
- Flips the `rates` item in `GET /onboarding/status` to "completed" if this is the pro's first active rate.

---

## 3. `PATCH /api/v1/me/rates/:id`

Edits an existing rate. Any subset of `call_type` / `duration_minutes` / `price_kobo` is allowed; at least one must be present.

**Per-user rate limit:** 60 requests / 60 minutes (shared with `DELETE`).

**URL params**
- `id` — must match `^rate_[a-z0-9]+$` (the prefixed ULID format we issue).

**Request — examples**

Update price only:
```json
{ "price_kobo": 2000000 }
```

Update duration + price:
```json
{ "duration_minutes": 20, "price_kobo": 2200000 }
```

Switch from audio to video for same duration:
```json
{ "call_type": "video" }
```

Body is strict (extra keys → 400). Empty body → 400 with `_root` field error.

**Response — 200** — same shape as the `GET` list item.

**Errors**
| Status | code | When |
|---|---|---|
| 400 | `validation_error` | Empty body / bad shape / `id` URL param fails `^rate_[a-z0-9]+$` (returns `field_errors.id`) |
| 401 | `unauthorized` | Bearer missing/invalid |
| 403 | `forbidden` | Caller's role is `client` |
| 404 | `not_found` | `id` is well-formed but the rate doesn't exist, is soft-deleted, or belongs to another user |
| 409 | `conflict` | Edit would create a duplicate `(call_type, duration_minutes)` shape with another active rate |
| 422 | `value_out_of_range` | New `call_type` not in `rates.allowed_call_types`, OR new `duration_minutes` not in allowed set, OR new `price_kobo` outside bounds (`field_errors` indicates which) |
| 429 | `rate_limited` | Per-user (60/60min) or global limit |

**Notes**
- The shape uniqueness check accounts for the rate being edited — you can re-PATCH the same rate with the same shape values without a 409 (it's a no-op compared to itself).
- Ownership is enforced by `WHERE user_id = $self`. Trying to PATCH another pro's rate returns `404` (not 403) to avoid leaking existence.

**Side-effects:** updates the row's columns; does NOT touch `created_at` or `deleted_at`.

---

## 4. `DELETE /api/v1/me/rates/:id`

Soft-deletes the rate.

**Per-user rate limit:** 60 requests / 60 minutes (shared with `PATCH`).

**Response — 204** (empty body).

**Errors**
| Status | code | When |
|---|---|---|
| 400 | `validation_error` | `id` URL param fails `^rate_[a-z0-9]+$` (returns `field_errors.id`) |
| 401 | `unauthorized` | Bearer missing/invalid |
| 403 | `forbidden` | Caller's role is `client` |
| 404 | `not_found` | `id` is well-formed but already deleted, never existed, or owned by another user |
| 429 | `rate_limited` | Per-user (60/60min) or global limit |

**Side-effects**
- Sets `deleted_at = now()` on the row.
- If this was the pro's last active rate, `GET /onboarding/status` flips `rates` back to "incomplete" — and `POST /onboarding/kyc/complete` would now return `422 kyc_incomplete`.
- Re-evaluates KYC status: if the pro was `approved` and this delete made them incomplete, `users.kyc_status` is demoted back to `pending_review`. See onboarding-apis §1 "Status demotion."

**Notes**
- Subsequent `GET /me/rates` will not include this rate.
- `DELETE` is idempotent in the sense that a second call with the same `id` returns `404` (not `204`). The mobile should treat both 204 and 404 as "the rate is gone."

---

## 5. End-to-end flow (mobile rates editor)

```
1. Open editor      GET  /me/rates
2. Add a rate       POST /me/rates       → 201
3. Edit price       PATCH /me/rates/:id  → 200
4. Remove a rate    DELETE /me/rates/:id → 204
5. Refresh          GET  /me/rates
```

Discovery (other pros' rates) lives at `GET /professionals/:id/rates` (not yet implemented; coming with the professionals feature). That endpoint returns the same shape as `GET /me/rates`.

---

## 6. Configuration

| Key | Default | `is_public` | Used by |
|---|---|---|---|
| `rates.min_kobo` | `50000` (₦500) | TRUE | `POST /me/rates`, `PATCH /me/rates/:id` |
| `rates.max_kobo` | `50000000` (₦500k) | TRUE | same |
| `rates.allowed_durations_minutes` | `[5, 10, 15, 20, 25, 30, 45, 60]` | TRUE | same |
| `rates.allowed_call_types` | `["audio", "video"]` | TRUE | same — added in migration `0062_seed_rates_allowed_call_types`. Disabling a value (e.g. dropping `"video"`) is rejected at create/update time but does NOT delete existing rows that already use the disabled type — those continue to surface in `GET /me/rates` until the pro deletes them. |

Read at every call-site via `platformConfig.rate()`. The values are seeded in `platform_config` and admin-editable via `PATCH /admin/config`; defaults in [src/lib/config/platform-config.service.ts](apps/backend/src/lib/config/platform-config.service.ts) are used as fallbacks when a row is missing or malformed.

### Frontend consumption

All four keys are public. The customer-web reads them via `GET /platform-config/public` (cached for 5 min) and threads them into the `AddRateForm` widget so the call-type and duration dropdowns mirror the live config and the price field shows an inline `Allowed range: ₦500 – ₦500,000` hint with min/max validation. See `apps/customer-web/src/features/profile/screen/profile-rates-screen.tsx` and `apps/customer-web/src/features/professional-kyc/screen/parts/rates-modal-content.tsx`. Admin changes propagate to clients within ~5 min (server snapshot refresh + frontend public-config TTL).
