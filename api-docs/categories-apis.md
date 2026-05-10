# Categories API Reference

> Backend service for ohlify. The single category endpoint drives the category chips on Home and on the search filter. All endpoints require a Bearer access token. Read **Common conventions** in `onboarding-apis.md` once.

**Base URL:** `https://api.ohlify.com` (prod) · `http://localhost:8082` (local)
**Version prefix:** `/api/v1`

---

## Table of Contents

| # | Method | Path | Auth | Purpose |
|---|---|---|---|---|
| 1 | GET | `/api/v1/professional-categories` | Bearer | List active categories with synthetic `all` prepended |

> The category list is also **inlined into `GET /home`** (key: `categories`). Mobile clients can skip a round trip on Home mount.

---

## 1. `GET /api/v1/professional-categories`

Returns the list of active professional categories. Cached aggressively at the CDN; the server emits a strong `Cache-Control` header + a weak ETag derived from the seeded set.

**Auth:** Bearer + active user (soft-deleted users get `401 token_invalid`).

**Request:** none.

**Response — 200**
```json
{
  "data": [
    { "value": "all",       "label": "All",            "icon_url": null },
    { "value": "lawyer",    "label": "Lawyer",         "icon_url": null },
    { "value": "doctor",    "label": "Doctor",         "icon_url": null },
    { "value": "therapist", "label": "Therapist",      "icon_url": null }
  ]
}
```

- The synthetic `{value:"all", label:"All", icon_url:null}` is **server-prepended**. Clients must NOT hardcode it — when a value is added, the order changes; trust the response.
- `value` is the canonical category code (lowercase snake_case). `PATCH /me { categories: [...] }` accepts these values verbatim.
- Sorted by `sort_order ASC, value ASC`.

**Response — 304 Not Modified**
- Returned with empty body when the request `If-None-Match` matches the current ETag.

**Response headers**
| Header | Value | Notes |
|---|---|---|
| `Cache-Control` | `public, max-age=86400` | 24 hours |
| `ETag` | `W/"cats-<sha256-prefix>"` | Weak, derived from the active row set |

**Errors**
| Status | code | When |
|---|---|---|
| 401 | `unauthorized` | Bearer header missing/invalid |
| 401 | `token_invalid` | JWT decoded but the user row is missing or soft-deleted |
| 429 | `rate_limited` | Global rate limit |

**Side-effects:** none.

**Notes for clients**
- Category values that don't appear in this list are rejected by `PATCH /me { categories }` with `422 category_invalid`. Always use this endpoint as the source of truth.
- The `all` synthetic value is for client filter UX only — it's NOT a valid value for `PATCH /me { categories }` or `GET /professionals?category=…` filters (the server treats `category=all` as "no filter"; sending other values filters the list).

---

## 2. Configuration

Categories are seeded in migration `0017_seed_categories.ts`. Admin endpoints to manage categories ship with §21 admin features. Until then the seed is the canonical list.
