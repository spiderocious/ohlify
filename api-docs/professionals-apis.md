# Professionals + Home API Reference

> Backend service for ohlify. Discovery endpoints power the Home screen, the Search & Filter screen, and the Professional Detail screen. All endpoints require a Bearer access token. Read **Common conventions** in `onboarding-apis.md` once.

**Base URL:** `https://api.ohlify.com` (prod) · `http://localhost:8082` (local)
**Version prefix:** `/api/v1`

---

## Table of Contents

| # | Method | Path | Auth | Purpose |
|---|---|---|---|---|
| 1 | GET | `/api/v1/home` | Bearer | Home bootstrap: upcoming calls + popular pros + categories + active meeting |
| 2 | GET | `/api/v1/professionals` | Bearer | Search/filter/sort professionals (cursor-paginated) |
| 3 | GET | `/api/v1/professionals/:id` | Bearer | Full detail for one professional |
| 4 | GET | `/api/v1/professionals/:id/rates` | Bearer | List that professional's active rates |
| 5 | GET | `/api/v1/professionals/:id/reviews` | Bearer | Cursor-paginated reviews (returns empty list until §10 ships) |
| 6 | GET | `/api/v1/professionals/:id/availability` | Bearer | Slot grid for the schedule screen |

> **Visibility rules.** A professional appears in any of these endpoints only when:
> `users.role = 'professional' AND users.deleted_at IS NULL AND users.kyc_status = 'approved'`. The `is_available` flag is **not** part of visibility — unavailable pros still appear in lists/detail; the client uses `is_available=false` to disable the Schedule button. A pro who fails the visibility predicate returns `404 not_found` from any of these endpoints.

---

## 1. `GET /api/v1/home`

Single bootstrap endpoint for the Home screen. Returns four parallel queries in one payload.

**Auth:** Bearer + active user.

**Per-user rate limit:** 120 requests / 60 seconds.

**Response — 200**
```json
{
  "data": {
    "upcoming_calls": [],
    "popular_professionals": [
      {
        "id": "u_01j...",
        "name": "Kehinde Osinbajo",
        "occupation": "Senior sales manager",
        "avatar_url": null,
        "rating": 4.9,
        "review_count": 312,
        "base_price_kobo": 1080000,
        "currency": "NGN",
        "is_available": true,
        "categories": ["lawyer"]
      }
    ],
    "categories": [
      { "value": "all",    "label": "All",    "icon_url": null },
      { "value": "lawyer", "label": "Lawyer", "icon_url": null }
    ],
    "active_meeting": null
  }
}
```

**Field notes**
- `upcoming_calls` — empty list until the bookings feature (§8) ships. The shape is final per spec api-needed.md §7.1.5; the client should already render an empty scroller.
- `popular_professionals` — top 8 pros by `review_aggregates.rating DESC, review_count DESC`. While the `review_aggregates` table is empty (or not yet migrated), pros are returned in default user-listing order with `rating: 0, review_count: 0`.
- `categories` — same array `GET /professional-categories` returns. Inlined to save a round trip on Home mount.
- `active_meeting` — null until §8 ships.

**Caching**
- Per-user response cache in Redis under `home:{userId}`, TTL 300s. Invalidated when the bookings feature publishes call state changes.
- 🟡 Warm caching per spec.

**Errors**
| Status | code | When |
|---|---|---|
| 401 | `unauthorized` | Bearer header missing/invalid |
| 401 | `token_invalid` | User row missing or soft-deleted |
| 429 | `rate_limited` | Per-user (120/60s) or global limit |

---

## 2. `GET /api/v1/professionals`

Discovery list. Drives the Search/Filter screen and `/professionals/popular` (which is just this endpoint with `sort=rating&limit=10`).

**Auth:** Bearer + active user.

**Per-user rate limit:** 120 requests / 60 seconds.

**Query parameters** — all optional, body is strict.
| Param | Type | Default | Notes |
|---|---|---|---|
| `q` | string (1-100) | — | Postgres FTS over `full_name || ' ' || occupation` (simple-language). Debounce client-side. |
| `category` | string (1-60) | — | Filter to pros with `category = ANY(users.categories)`. Pass a value from `GET /professional-categories` (skip `all`). |
| `sort` | enum | `rating` | One of `rating` \| `price` \| `name`. |
| `direction` | enum | `desc` for rating, `asc` for price/name | One of `asc` \| `desc`. |
| `cursor` | base64url | — | Opaque cursor returned by the previous page's `meta.next_cursor`. |
| `limit` | int (1-50) | 20 | Page size. |

**Response — 200**
```json
{
  "data": [
    {
      "id": "u_01j...",
      "name": "Jocelyn Aminoff",
      "occupation": "Senior sales manager",
      "avatar_url": null,
      "rating": 4.9,
      "review_count": 187,
      "base_price_kobo": 1080000,
      "currency": "NGN",
      "is_available": true,
      "categories": ["lawyer"]
    }
  ],
  "meta": {
    "next_cursor": "eyJsYXN0X2lkIjoidV8wMWoiLCJsYXN0X3NvcnRfa2V5IjoiNC45In0",
    "has_more": true
  }
}
```

**Field notes**
- `name` is `users.full_name`. May be null for KYC-incomplete pros, though the visibility predicate (`kyc_status='approved'`) usually means it's set.
- `occupation` is the pro's job title (renamed from spec's "role" to avoid confusion with the user-role enum).
- `base_price_kobo` is `MIN(professional_rates.price_kobo)` for that user where `deleted_at IS NULL`. `null` when the pro has no active rates.
- Sort tiebreaker is always `users.id ASC` (stable cursor) regardless of `direction`.
- Cursor is validated for shape: any tampered/empty/missing-fields cursor returns **400 `validation_error`** with `field_errors.cursor`, never 500.
- Cursor comparison is **type-aware**: `rating` and `price` use numeric comparison (so `4.9` < `40` numerically, not lexicographically); `name` uses text comparison.

**Errors**
| Status | code | When | Includes `field_errors`? |
|---|---|---|---|
| 400 | `validation_error` | Invalid query shape (e.g. `sort=foo`, `limit=51`, malformed cursor) | yes |
| 401 | `unauthorized` / `token_invalid` | Auth | no |
| 429 | `rate_limited` | Per-user (120/60s) or global limit | no |

**Caching**
- Per-query response cache, key: `prof:list:<sha-of-query>`, TTL 120s.
- 🟡 Warm caching per spec.

---

## 3. `GET /api/v1/professionals/:id`

Full detail for the Professional Detail screen.

**Auth:** Bearer + active user.

**Per-user rate limit:** 200 requests / 60 seconds.

**URL params**
- `id` — must match `^u_[a-z0-9]+$`. 400 `validation_error` otherwise (with `field_errors.id`).

**Response — 200**
```json
{
  "data": {
    "id": "u_01j...",
    "name": "Kehinde Osinbajo",
    "occupation": "Senior sales manager",
    "avatar_url": null,
    "cover_photo_url": null,
    "description": "...",
    "rating": 4.9,
    "review_count": 312,
    "is_available": true,
    "interests": ["Relationship", "Technology"],
    "categories": ["lawyer"],
    "handle": "kehinde-o",
    "share_slug": "kehinde-o-a1b2c3",
    "base_price_kobo": 1100000,
    "currency": "NGN"
  }
}
```

**Field notes**
- `share_slug` derives from `handle` + a stable 6-hex hash of `users.id`. Stable across requests for the same user.
- `cover_photo_url` is currently always null (not yet implemented per discussion).

**Errors**
| Status | code | When |
|---|---|---|
| 400 | `validation_error` | `id` URL param fails `^u_[a-z0-9]+$` |
| 401 | `unauthorized` / `token_invalid` | Auth |
| 404 | `not_found` | Pro is missing, soft-deleted, role!=professional, or kyc_status!=approved |
| 429 | `rate_limited` | Per-user (200/60s) or global limit |

**Caching**
- Per-pro response cache, key: `prof:detail:{id}`, TTL 300s.
- 🟡 Warm caching per spec.

---

## 4. `GET /api/v1/professionals/:id/rates`

Lists that professional's active rates. Same shape as `GET /me/rates` but for a third party.

**Auth:** Bearer + active user.

**Per-user rate limit:** 200 requests / 60 seconds (shared with detail/reviews).

**Response — 200**
```json
{
  "data": [
    { "id": "rate_01j...", "call_type": "audio", "duration_minutes": 10, "price_kobo": 1080000, "currency": "NGN" },
    { "id": "rate_01k...", "call_type": "video", "duration_minutes": 25, "price_kobo": 3000000, "currency": "NGN" }
  ]
}
```

Empty list returns `{"data": []}`. Sorted by `call_type ASC, duration_minutes ASC`.

**Errors**
| Status | code | When |
|---|---|---|
| 400 | `validation_error` | `id` URL param fails regex |
| 404 | `not_found` | Pro fails the visibility predicate |
| 401 / 429 | … | Auth / rate-limit |

**Caching:** `prof:rates:{id}`, TTL 300s. Invalidated when the pro mutates their own rates (post-§10 wiring).

---

## 5. `GET /api/v1/professionals/:id/reviews`

Cursor-paginated reviews list.

**Auth:** Bearer + active user.

**Status:** **stubbed.** The reviews + review_aggregates tables ship with §10 (feedback + rating). Until then this endpoint returns `{ "data": [], "meta": { "next_cursor": null, "has_more": false } }` with HTTP 200 — endpoint shape is final per spec §7.5.

**Query parameters**
| Param | Type | Default | Notes |
|---|---|---|---|
| `cursor` | base64url | — | Opaque cursor from previous page |
| `limit` | int (1-50) | 20 | Page size |

**Response — 200**
```json
{
  "data": [],
  "meta": { "next_cursor": null, "has_more": false }
}
```

When reviews are wired (§10), each item will have shape:
```json
{
  "id": "rv_01j...",
  "author_name": "Adaeze Umeh",
  "author_avatar_url": null,
  "rating": 5.0,
  "comment": "Excellent session...",
  "created_at": "2026-04-17T12:00:00Z"
}
```

**Errors**
| Status | code | When |
|---|---|---|
| 400 | `validation_error` | `id` URL param fails regex / bad query |
| 404 | `not_found` | Pro fails the visibility predicate |
| 401 / 429 | … | Auth / rate-limit |

**Caching:** `prof:reviews:{id}:empty` while stubbed. Real-cache key + invalidation lands with §10.

---

## 6. `GET /api/v1/professionals/:id/availability`

Slot grid for the schedule screen.

**Auth:** Bearer + active user.

**Per-user rate limit:** 60 requests / 60 seconds (the schedule screen calls this on mount + on date-range changes).

**Query parameters**
| Param | Type | Default | Notes |
|---|---|---|---|
| `from` | ISO date `YYYY-MM-DD` | today (UTC) | Inclusive start |
| `to` | ISO date `YYYY-MM-DD` | `from + 14 days` | Exclusive end |
| `call_type` | `audio` \| `video` | — | Reserved for filtering (currently ignored — pros offer all rate combinations) |
| `duration_minutes` | int | — | Reserved for filtering (currently ignored) |
| `tz` | IANA timezone string | `Africa/Lagos` | **Honored** in slot computation. Day boundaries (`days[].date`) and slot wall-clock hours are interpreted in `tz`. Slot `start_at` instants are emitted in UTC; the client converts back for display. Validated via `Intl.DateTimeFormat` — invalid zones return `400 validation_error`. |

The window cannot exceed **30 days** — the server returns `422 value_out_of_range` (`field_errors.to`) otherwise. `to` must be **strictly after** `from` — equal or earlier dates return `400 validation_error` with `field_errors.to`.

**Response — 200**
```json
{
  "data": {
    "timezone": "Africa/Lagos",
    "days": [
      {
        "date": "2026-04-26",
        "slots": [
          { "start_at": "2026-04-26T08:00:00.000Z", "available": true },
          { "start_at": "2026-04-26T08:30:00.000Z", "available": true },
          { "start_at": "2026-04-26T09:00:00.000Z", "available": true }
        ]
      }
    ]
  }
}
```

**Algorithm (current MVP)**
1. Walk the date range `[from, to)` day-by-day, **interpreting each day boundary in `tz`** (so `2026-04-27` in `America/New_York` is a different 24-hour window than `2026-04-27` in `Africa/Lagos`).
2. For each day, build wall-clock slots from `daily_start_hour` to `daily_end_hour` (exclusive) at `slot_minutes` granularity, **interpreted in `tz`**.
3. Convert each wall-clock slot to a UTC instant (DST-aware via `Intl.DateTimeFormat`).
4. Mark `available = false` for slots earlier than `now() + no_instant_booking_minutes` (default `30`). All other slots are marked `available = true`.
5. Once the bookings feature (§8) ships, an additional intersection step subtracts slots conflicting with `calls.scheduled_range && slot_range`. Until then, `available` reflects only the time-floor cut.

**Examples of `tz` impact:**
- `tz=Africa/Lagos`, slot at `09:00 local` on `2026-04-27` → `start_at: 2026-04-27T08:00:00.000Z` (UTC+1).
- `tz=America/New_York`, slot at `09:00 local` on `2026-04-27` → `start_at: 2026-04-27T13:00:00.000Z` (UTC-4 in DST).
- `tz=Asia/Tokyo`, slot at `09:00 local` on `2026-04-27` → `start_at: 2026-04-27T00:00:00.000Z` (UTC+9). Note that this UTC instant lands on `2026-04-26` in Lagos — but the response groups it under `2026-04-27` because the request's `tz` is Tokyo.

**Configuration knobs** (all in [src/lib/config/platform-config.service.ts](apps/backend/src/lib/config/platform-config.service.ts)):
| Key | Default |
|---|---|
| `availability.daily_start_hour` | `9` |
| `availability.daily_end_hour` | `21` (exclusive) |
| `availability.slot_minutes` | `30` |
| `availability.default_window_days` | `14` |
| `availability.max_window_days` | `30` |
| `availability.no_instant_booking_minutes` | `30` |
| `availability.default_timezone` | `Africa/Lagos` |

These are constants today; will be admin-tunable when the platform config table-backed reader ships. Per-pro overrides are explicitly deferred ("phase 3" per docs/professionals.md §6).

**Pro-declared "do not book" windows.** A slot whose `[start_at, start_at + duration)` (interpreted in the request's `tz`) overlaps any of the pro's saved booking blocks is returned with `available: false` — same field, same shape as a booked-out slot. The pro manages this list via `PUT /me/booking-blocks` (see `profile-apis.md §16`). Empty list = no exclusions.

**Errors**
| Status | code | When |
|---|---|---|
| 400 | `validation_error` | Bad date format, bad enum, `to <= from` (returns `field_errors.to`), OR invalid IANA `tz` (returns `field_errors.tz`) |
| 401 / 429 | … | Auth / rate-limit |
| 404 | `not_found` | Pro fails the visibility predicate |
| 422 | `value_out_of_range` | Window exceeds `max_window_days` (30 days) |

**Caching**
- 🔴 **Cold** per spec — the slot grid changes any moment a booking is created/cancelled. No response cache.

---

## 7. End-to-end discovery flow

```
1. App start          GET /home                               → bootstrap (parallel queries)
2. User taps category GET /professionals?category=lawyer     → list
3. User taps a pro    GET /professionals/:id                  → detail
4. Tap "Schedule"     GET /professionals/:id/rates            → rate options
                      GET /professionals/:id/availability     → slot grid
5. Tap "Reviews"      GET /professionals/:id/reviews          → list (paginated)
6. Confirm booking    POST /calls                             → bookings feature (§8, not yet shipped)
```

Steps 1-5 are read-only; the writes start at step 6.

---

## 8. Errors reference

All error responses follow the standard envelope:
```json
{ "error": { "code": "<snake_case>", "message": "<human readable>", "field_errors": { "...": ["..."] } } }
```

Discovery-specific codes:
| Code | HTTP | Meaning |
|---|---|---|
| `not_found` | 404 | Pro fails the visibility predicate (gone, soft-deleted, not pro, or kyc not approved) |
| `validation_error` | 400 | Bad query/param shape (Zod), includes `field_errors` |
| `value_out_of_range` | 422 | Availability window exceeds the max |

---

## 9. `GET /api/v1/me/dashboard` — the professional's home

Auth required. 403 `forbidden` for any caller whose role is not `professional`.

**One endpoint serves the whole screen.** The dashboard previously issued
several reads; every figure on it now arrives in a single response, cached per
user and busted by the writes that move it (see §9.3).

`?days=` is still accepted and **ignored**. It selected the sparkline window,
and the sparkline is gone — but shipped builds still send it, and rejecting a
parameter that used to be valid would break them.

### 9.1 Response

```json
{
  "data": {
    "is_available": true,
    "kyc_status": "approved",
    "kyc_reject_reason": null,
    "earnings": {
      "today_kobo": 4200000,
      "week_kobo": 18450000,
      "withdrawable_kobo": 18450000,
      "today_delta": { "percent": 12.4, "label": null },
      "week_delta":  { "percent": null, "label": "first week" }
    },
    "attention": {
      "unread_messages": 2,
      "pending_schedules": 1,
      "missed_calls_today": 0
    },
    "recent_calls": [ /* … */ ],
    "transactions": [
      {
        "id": "we_…",
        "type": "call_earning",
        "amount_kobo": 250000,
        "currency": "NGN",
        "status": "completed",
        "occurred_at": "2026-08-22T14:30:00.000Z",
        "title": "Call earning",
        "description": "Earnings from a completed call",
        "icon": "call",
        "direction": "credit",
        "reference": null
      }
    ]
  }
}
```

### 9.2 The delta shape

`today_delta` and `week_delta` are **either** a percentage **or** a reason there
isn't one — never both, and never a fabricated zero:

| Case | `percent` | `label` |
|---|---|---|
| Normal comparison | signed number, 1dp | `null` |
| Baseline period was ₦0 | `null` | `"first earnings"` |
| Both periods ₦0 | `null` | `"no change"` |
| First credit landed inside this window | `null` | `"first day"` / `"first week"` |
| Never earned anything | `null` | `"no earnings yet"` |

A percentage needs a baseline period that actually existed. Sending `0` for a
professional in their first week would read as "flat" when the truth is "there
is nothing to compare to yet" — so the client branches on `percent === null`
and renders `label` verbatim.

`transactions` uses the **same field names and vocabulary** as
`GET /wallet/transactions`, built from the same `lookupWalletTxVocabulary`
lookup. Two surfaces showing a person their own money must not disagree about
what a row is called.

### 9.3 Caching

Cached per user at `pro:dashboard:<userId>` for 60s. The TTL is a backstop, not
the mechanism — it catches the things no request mutates (a call ageing out of
"today", the 7-day window sliding). Writes bust the key directly:

| Write | Hook |
|---|---|
| Any money movement | `postJournal` → busts **every** user with a line on the journal, so a settlement clears both sides |
| Call ends (missed, declined, ring-timeout, hangup, stale-resolver) | `instantCallsRepo.finalize` — the one point every ending converges on. A missed call posts no journal, so the money path would never see it |
| Message sent / read | `chatRepo.bumpAfterMessage`, `chatRepo.markRead` |
| Schedule proposal answered | `chatRepo.updateScheduleStatus` |

Busts are **deferred to after COMMIT** and dropped on rollback: invalidating
before the write is durable would refill the cache from the state the caller
then abandoned, leaving it wrong for a full TTL — strictly worse than not
busting at all. Every bust is best-effort and cannot fail the write it follows.
