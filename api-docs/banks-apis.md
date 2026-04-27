# Banks API Reference

> Backend service for ohlify. Banks endpoints drive the bank-picker on the bank-account form and the server-side Paystack name-enquiry. All endpoints require a Bearer access token. Read **Common conventions** in `onboarding-apis.md` once, then jump to the endpoint of interest.

**Base URL:** `https://api.ohlify.com` (prod) · `http://localhost:8080` (local)
**Version prefix:** `/api/v1`

---

## Table of Contents

| # | Method | Path | Auth | Purpose |
|---|---|---|---|---|
| 1 | GET | `/api/v1/banks` | Bearer | List all active Nigerian banks (cached, ETag-aware) |
| 2 | GET | `/api/v1/banks/resolve?account_number=…&bank_code=…` | Bearer | Server-side Paystack account-name resolve |

> **Related:** `PUT /me/bank-account` (profile API) calls Paystack `/bank/resolve` server-side and validates the resolved name against the user's `full_name` using fuzzy matching (Jaro-Winkler). The standalone `/banks/resolve` endpoint exposes the same machinery to mobile clients so they can pre-fill / pre-validate before submitting.

---

## 1. `GET /api/v1/banks`

Returns the full list of active banks. Cached aggressively at the CDN; the server emits a strong cache header + a weak ETag derived from `MAX(banks.synced_at)`.

**Auth:** Bearer.

**Request:** none.

**Response — 200**
```json
{
  "data": [
    { "code": "044", "name": "Access Bank",  "logo_url": null },
    { "code": "058", "name": "Guaranty Trust Bank", "logo_url": null },
    { "code": "057", "name": "Zenith Bank", "logo_url": null }
  ]
}
```

**Response — 304 Not Modified**
- Returned with empty body when the request `If-None-Match` matches the current ETag.
- Save bandwidth — clients should cache aggressively and revalidate with `If-None-Match`.

**Response headers**
| Header | Value | Notes |
|---|---|---|
| `Cache-Control` | `public, max-age=86400` | 24 hours |
| `ETag` | `W/"banks-<sha256-prefix>"` | Weak, derived from `MAX(synced_at)` |

**Errors**
| Status | code | When |
|---|---|---|
| 401 | `unauthorized` | Bearer header missing/invalid |
| 429 | `rate_limited` | Global rate limit |

**Side-effects:** none.

**Notes for clients**
- The list is sorted alphabetically by `name`.
- `code` is the Paystack bank code — that's the value to send to `PUT /me/bank-account` and `GET /banks/resolve`.
- `logo_url` may be `null` until banks are synced from Paystack with logos. Render a placeholder.
- The list refreshes when an admin re-syncs banks; the ETag changes as a side effect, so clients on `If-None-Match` immediately re-fetch.

---

## 2. `GET /api/v1/banks/resolve`

Synchronous Paystack name-enquiry. Use this on the bank-account form to show the resolved account name **before** the user submits, so they can confirm it matches their identity.

**Auth:** Bearer.

**Per-user rate limits**
- 30 requests / 60 seconds (debounced typing on a form)
- 100 requests / 60 minutes (long-tail)

**Query**
| Param | Required | Format |
|---|---|---|
| `account_number` | yes | 8–12 digits, regex `^\d{8,12}$` |
| `bank_code` | yes | 2–10 chars; must be the `code` returned by `GET /banks` |

**Response — 200**
```json
{ "data": { "account_name": "Adekunle Ifeanyi Musa" } }
```

**Errors**
| Status | code | When |
|---|---|---|
| 400 | `validation_error` | Bad query shape — includes `field_errors` for `account_number` and/or `bank_code` |
| 401 | `unauthorized` | Bearer header missing/invalid |
| 422 | `bank_not_found` | `bank_code` is unknown or marked inactive in our `banks` table |
| 422 | `unresolvable_account` | Paystack returned no match for `(account_number, bank_code)` |
| 429 | `rate_limited` | Per-user (30/60s or 100/60m) or global limit hit; includes `Retry-After` |
| 502 | `upstream_unavailable` | Paystack upstream error (timeout, 5xx). Response includes `Retry-After: 5`. Retry after that hint (or longer with exponential backoff). |

**Side-effects:**
- Successful resolves are cached in Redis for 60 seconds under `bank-resolve:{bank_code}:{account_number}` to absorb keystroke debounce + form re-submits.
- `unresolvable_account` results are also cached for 60 seconds (negative cache).
- Upstream failures (502) are NOT cached — the client retries immediately.
- **Cache is shared with `PUT /me/bank-account`.** Both endpoints call the same `resolveBankAccountCached` helper, so `GET /banks/resolve` followed within 60 seconds by `PUT /me/bank-account` for the same `(account_number, bank_code)` only hits Paystack once.

**Notes for clients**
- Do not retry on 422 (`unresolvable_account` / `bank_not_found`). The user picked a wrong code or typed a non-existent account; surface the error and let them edit.
- Retry on 502 with exponential backoff (e.g. 500ms → 1s → 2s, max 3 attempts).
- The 60-second positive cache means typing the same account+bank twice within a minute returns instantly. This also matches the form's "blur → re-resolve on focus" UX.

---

## 3. End-to-end flow (mobile bank-account form)

This is the recommended sequence the mobile app should follow:

```
1. App start         GET /banks                  → list, cache 24h via ETag
2. User picks bank   (no API call; reuse cached list)
3. User types acct#  GET /banks/resolve?...      → live name preview
4. User confirms     PUT /me/bank-account        → server re-resolves + name-match check
```

The server **always re-resolves on `PUT /me/bank-account`** (it does not trust the value from step 3), but the resolve hits the **same Redis cache** populated by step 3 — so within 60s of step 3, step 4 does NOT spend a fresh Paystack quota call. The server then runs a Jaro-Winkler similarity check against `users.full_name` with a configurable threshold (currently 45%). See `profile-apis.md` §11 for the bank-account write semantics.

---

## 4. Configuration

Tunable via the platform config service ([src/lib/config/platform-config.service.ts](apps/backend/src/lib/config/platform-config.service.ts)). Today the values are constants; later they'll be backed by `platform_config` rows.

| Key | Default | Used by |
|---|---|---|
| `bank_account.min_name_match_percent` | `45` | Threshold for accepting Paystack's resolved name vs `users.full_name` on `PUT /me/bank-account` |

Changing `min_name_match_percent` does not require a deploy once the table-backed reader ships.

---

## 5. Related error codes (for reference)

| Code | Where it can come from |
|---|---|
| `account_name_mismatch` | `PUT /me/bank-account` only — when the resolved name's similarity to `users.full_name` is below threshold |
| `kyc_incomplete` | `PUT /me/bank-account` only — when `users.full_name` is empty (resolve cannot run without a comparison string) |
| `unresolvable_account` | This endpoint AND `PUT /me/bank-account` |
| `bank_not_found` | This endpoint AND `PUT /me/bank-account` |
