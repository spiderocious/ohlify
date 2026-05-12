# Onboarding KYC Spec API

> Single endpoint that drives the entire onboarding KYC screen. Backend declares **which items** are required for the caller's role, **what kind of input** each one is, **how to validate it**, and **what's currently saved**. The frontend renders modals dynamically from this response and saves each item to its dedicated endpoint as the user fills it.

**Base URL:** `https://api.ohlify.com` (prod) · `http://localhost:8082` (local)
**Version prefix:** `/api/v1`

---

## Why this exists

Before this endpoint, the frontend KYC screen hardcoded:
- the list of items (`KYC_ITEMS`)
- their order, labels, and helper text
- which were required vs. optional

…all of which had to stay in lockstep with `PROFESSIONAL_KYC_ITEMS` on the backend or `POST /onboarding/kyc/complete` would fail with `kyc_incomplete` and the user would have no idea what was missing. It also meant a refresh wiped form state because nothing was loaded from the server on mount.

This endpoint collapses that into one round-trip:

1. Frontend mounts the KYC screen.
2. Calls `GET /api/v1/onboarding/kyc/spec`.
3. Renders one tile/modal per `item`, seeded with `item.value`, ticked when `item.complete` is true.
4. Each save invalidates the spec query → values + completion flags refetch.

When admins add a new item (e.g. selfie), or mark one optional, or rename a label, **no frontend deploy is needed** — the change ships through `platform_config`.

---

## Endpoint

### `GET /api/v1/onboarding/kyc/spec`

**Auth:** Bearer.

**Request:** none. Role is derived from the authenticated user.

**Response — 200**

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
        "subtitle": "A unique handle others can find you by (e.g. @feranmi).",
        "required": true,
        "enabled": true,
        "validation": [
          { "rule": "regex", "value": "^[a-z0-9_]{3,20}$",
            "message": "3–20 chars, lowercase letters, digits, underscore." }
        ],
        "value": null,
        "complete": false
      },
      {
        "key": "occupation",
        "kind": "text",
        "label": "Occupation",
        "subtitle": "Let clients know what you do.",
        "required": true,
        "enabled": true,
        "validation": [
          { "rule": "max_length", "value": 60 }
        ],
        "value": "Lawyer",
        "complete": true
      },
      {
        "key": "description",
        "kind": "textarea",
        "label": "About you",
        "subtitle": "A short intro about who you are and how you help.",
        "required": true,
        "enabled": true,
        "validation": [
          { "rule": "max_length", "value": 280 }
        ],
        "value": null,
        "complete": false
      },
      {
        "key": "interests",
        "kind": "tags",
        "label": "Interests",
        "subtitle": "Pick topics so we can recommend you to the right clients.",
        "required": true,
        "enabled": true,
        "validation": [
          { "rule": "min_items", "value": 1 },
          { "rule": "max_items", "value": 8 }
        ],
        "value": ["technology", "law"],
        "complete": true
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
          { "rule": "allowed_id_methods", "value": ["nin", "bvn", "passport", "drivers_license"] },
          { "rule": "id_number_per_method",
            "value": {
              "nin": { "rule": "regex", "value": "^[0-9]{11}$" },
              "bvn": { "rule": "regex", "value": "^[0-9]{11}$" },
              "passport": { "rule": "regex", "value": "^[A-Z0-9]{8,10}$" },
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
        "validation": [
          { "rule": "allowed_extensions", "value": ["jpg", "jpeg", "png"] }
        ],
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
        "validation": [
          { "rule": "min_items", "value": 1 }
        ],
        "value": [
          { "id": "rt_01...", "call_type": "audio", "duration_minutes": 15, "price_kobo": 500000 }
        ],
        "complete": true
      }
    ],
    "completed_count": 6,
    "total_required": 9,
    "all_complete": false
  },
  "message": "Onboarding KYC spec fetched."
}
```

**Response — 401:** standard `token_invalid`.

---

## Item shape — `KycItemSpec`

```ts
interface KycItemSpec<TValue = unknown> {
  /** Stable identifier. Matches the field name on the user / kyc_submissions / etc. row. */
  key: KycItemKey;

  /** Determines how the frontend renders the modal. See "Kinds" below. */
  kind: KycItemKind;

  /** Tile + modal heading. */
  label: string;

  /** One-line helper text under the heading. */
  subtitle: string;

  /** Whether the user must complete this before /kyc/complete will succeed. */
  required: boolean;

  /** Whether the item is shown at all. Disabled items are not rendered nor required. */
  enabled: boolean;

  /** Per-item rules the frontend uses for inline validation. */
  validation: ValidationRule[];

  /** Currently-saved value, or null when nothing is saved. Shape depends on `kind`. */
  value: TValue | null;

  /** True when value is present AND passes the server-side completeness check. */
  complete: boolean;
}
```

### Kinds

| `kind` | Value shape | Save endpoint |
|---|---|---|
| `text` | `string` | `PATCH /onboarding/kyc/professional` body `{ [key]: value }` |
| `textarea` | `string` | same |
| `tags` | `string[]` | same |
| `handle` | `string` | same (uniqueness checked server-side) |
| `bank` | `{ bank_code, bank_name, account_number_masked, account_name }` | `PUT /me/bank-account` |
| `identity` | `{ method, id_number_masked, document_upload_key }` | `PATCH /onboarding/kyc/professional` body `{ identity: { method, id_number, document_upload_key } }` |
| `selfie` | `{ upload_key }` | `PATCH /onboarding/kyc/professional` body `{ selfie: { upload_key } }` |
| `rates` | `Rate[]` | `POST /me/rates` (per rate) |
| `image_upload` | `{ upload_key }` | item-specific |

> **Note.** The frontend never sees raw IDs (`id_number`) or full account numbers in the `value` field — only masks. Edits replace the whole value (re-enter ID, re-resolve bank). This keeps the spec safe to log or cache without leaking PII.

---

## Validation rules — `ValidationRule`

A discriminated union the frontend can interpret directly:

```ts
type ValidationRule =
  | { rule: 'min_length'; value: number; message?: string }
  | { rule: 'max_length'; value: number; message?: string }
  | { rule: 'min_items'; value: number; message?: string }
  | { rule: 'max_items'; value: number; message?: string }
  | { rule: 'regex'; value: string; message?: string }
  | { rule: 'numeric_only'; message?: string }
  | { rule: 'one_of'; value: string[]; message?: string }
  | { rule: 'allowed_extensions'; value: string[]; message?: string }
  | { rule: 'allowed_id_methods'; value: ('nin' | 'bvn' | 'passport' | 'drivers_license')[]; message?: string }
  | { rule: 'id_number_per_method'; value: Record<string, { rule: 'regex'; value: string }>; message?: string };
```

Frontend semantics:

- **`min_length` / `max_length`** — string length; for `text`, `textarea`, `handle`.
- **`min_items` / `max_items`** — array length; for `tags`, `rates`, plural uploads.
- **`regex`** — JS-compatible regex string. Frontend constructs `new RegExp(value)`. The `message` is shown verbatim under the field on mismatch; if absent the frontend falls back to a generic "Invalid format".
- **`numeric_only`** — same as `regex: '^[0-9]+$'` but the frontend can also constrain the input mode (`inputMode="numeric"`) for better mobile keyboards.
- **`one_of`** — value must be one of the listed strings. Use for radio-style fields.
- **`allowed_extensions`** — for upload kinds; the file picker filters to these extensions.
- **`allowed_id_methods`** — which ID types are offered in the identity dropdown.
- **`id_number_per_method`** — a regex per ID method. Switching the method updates the active regex.

Backend re-validates on save regardless. Frontend validation is for UX only.

---

## Source of truth — `platform_config`

Two new keys, marked `is_public = TRUE`:

- `kyc.professional_items` — JSON array of `KycItemSpec` minus `value` and `complete` (those are computed per-user at request time).
- `kyc.client_items` — same shape for clients.

Admins edit either by PATCHing `/admin/config` (existing endpoint), which writes the row + reloads the in-memory snapshot + writes an audit log.

The compiled-in defaults (in `lib/config/platform-config.service.ts`) match today's `PROFESSIONAL_KYC_ITEMS` exactly, plus `selfie` and a refined `identity` that requires a document upload. Migration `0052_seed_kyc_items.ts` seeds the row only if it's not already present (so a re-run is idempotent).

---

## Completeness check

`POST /onboarding/kyc/complete` now derives its required-items list from the same config:

```
required = items.filter(i => i.enabled && i.required).map(i => i.key)
```

For each required key, the service runs the existing per-item completeness check (`hasFullName`, `hasBankAccount`, etc.). If any are missing the response is:

```json
{
  "error": {
    "code": "kyc_incomplete",
    "message": "Some required items are incomplete.",
    "field_errors": {
      "incomplete_items": ["handle", "selfie"]
    }
  }
}
```

`field_errors.incomplete_items` is new — gives the frontend an actionable list.

---

## Lifecycle

```
                              GET /onboarding/kyc/spec
                                       │
                                       ▼
        ┌───────────── frontend renders modals from items[] ─────────────┐
        │                                                                │
        │  user fills X → saves to its dedicated endpoint                │
        │       │                                                        │
        │       ▼                                                        │
        │  invalidate(['kyc-spec']) → spec refetches → tile turns green  │
        │                                                                │
        └────────────────────────────────────────────────────────────────┘
                                       │
                       all required items complete
                                       │
                                       ▼
                       POST /onboarding/kyc/complete
                                       │
                                       ▼
                          → onboarding_step: 'complete'
```

---

## Caching

The spec is per-user and small (~1–2KB). React Query: `staleTime: 0` (always refetch after a save), `cacheTime: default`. Server-side: no HTTP cache; recomputed on each request because it embeds per-user values. The `platform_config` read is in-memory (snapshot refreshes every 5 min), so the spec endpoint is roughly the same cost as `GET /me`.
