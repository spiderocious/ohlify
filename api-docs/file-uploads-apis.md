# File Uploads API Reference

> External file storage service used by ohlify for KYC documents (ID photos, selfies), profile avatars, and any other user-supplied images. The service is **not** part of the ohlify backend — it lives at its own host and exposes a tiny pre-signed-URL API. Clients (mobile + web) talk to it directly; the ohlify backend only stores the resulting `key`.

**Base URL:** `https://go-file-service-production.up.railway.app`
**Auth:** none (public service — see Security section).

---

## Table of Contents

| # | Method | Path | Purpose |
|---|---|---|---|
| 1 | GET | `/get-upload-uri?ext=<ext>` | Mint a pre-signed PUT URL for a fresh upload. Returns the storage `key` you keep. |
| 2 | GET | `/get-file-uri?key=<key>` | Mint a short-lived pre-signed GET URL for displaying a previously-uploaded file. |

---

## Why a separate service?

Uploads don't go through the ohlify backend at all — clients PUT directly to object storage using a pre-signed URL. That means:

- The ohlify API never touches binary data (no streaming, no temp files, no memory pressure).
- Adding a new upload kind is just "store a `key` column" — no new endpoint, no new bucket policy.
- Read URLs are generated on demand and expire in an hour, so leaked URLs aren't durable.

The only persistent identifier is the **`key`** — a UUID + extension string (e.g. `8204e793-128e-48cb-a790-9fd9b2dbb61c.jpg`). Anywhere the ohlify backend wants to refer to an uploaded file, it stores the key.

---

## 1. `GET /get-upload-uri?ext=<ext>`

Returns a pre-signed PUT URL the client uses to upload one file directly to object storage.

**Query parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `ext` | string | yes | File extension without the leading dot. Common values: `jpg`, `jpeg`, `png`, `webp`, `pdf`. The extension becomes part of the returned `key`. |

**Response — 200**
```json
{
  "expires_in": "15m",
  "key": "ba91d389-66ac-49ce-8c88-410ea73898e1.jpg",
  "uri": "https://t3.storageapi.dev/optimized-tupperware-4oqsuq/ba91d389-66ac-49ce-8c88-410ea73898e1.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&…&X-Amz-Signature=…"
}
```

| Field | Description |
|---|---|
| `key` | Stable identifier the ohlify backend will store (e.g. on `kyc_submissions.document_upload_id`). Persist this. |
| `uri` | One-shot pre-signed PUT URL. Put the bytes here within `expires_in`. |
| `expires_in` | Window for the PUT, returned as a duration string (e.g. `"15m"`). After this, the URI is rejected. |

### Client usage

```ts
// 1. Mint the upload URL.
const { key, uri } = await fetch(
  `https://go-file-service-production.up.railway.app/get-upload-uri?ext=jpg`,
).then((r) => r.json());

// 2. PUT the file bytes directly to object storage.
const file: File = ...; // e.g. from <input type="file"> or <input capture="user">
await fetch(uri, {
  method: 'PUT',
  body: file,
  // No Content-Type header is required by the service. If you set one,
  // the browser may add it for you — that's fine.
});

// 3. Send `key` to the ohlify backend wherever you want to attach the file.
await apiClient.patch('/onboarding/kyc/professional', {
  json: { identity: { method: 'nin', id_number: '12345678901', document_upload_key: key } },
});
```

**On failure:** If the PUT request errors (network, 4xx, etc.), discard the `key` — the file slot is empty and the key isn't usable. Mint a fresh one for the retry.

---

## 2. `GET /get-file-uri?key=<key>`

Returns a short-lived pre-signed GET URL that resolves to the file bytes.

**Query parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `key` | string | yes | The `key` returned by `/get-upload-uri` and persisted on the ohlify backend. |

**Response — 200**
```json
{
  "cached": false,
  "expires_in": "1h",
  "uri": "https://t3.storageapi.dev/optimized-tupperware-4oqsuq/8204e793-128e-48cb-a790-9fd9b2dbb61c.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&…&X-Amz-Signature=…"
}
```

| Field | Description |
|---|---|
| `uri` | Pre-signed GET URL. Use as `<img src>`, fetch as bytes, or hand to a PDF viewer. |
| `expires_in` | Validity window for the URL (e.g. `"1h"`). |
| `cached` | `true` when the service returned a recent URL from its in-memory cache; `false` when it minted a fresh signature. Informational only — clients don't need to act on it. |

### Client usage

```ts
const { uri } = await fetch(
  `https://go-file-service-production.up.railway.app/get-file-uri?key=8204e793-128e-48cb-a790-9fd9b2dbb61c.jpg`,
).then((r) => r.json());

return <img src={uri} alt="ID document" />;
```

**Caching:** The URLs are signed for ~1 hour. For pages that hold a file open longer than that (an admin review screen, say), refetch on focus or on a timer slightly shorter than the expiry. React Query's `staleTime: 50 * 60 * 1000` works well.

---

## Security

This service is **public** — anyone can mint upload URLs. That's deliberate to avoid a backend round-trip per upload, but it means:

- **Bucket fill / spam.** Attackers can fill the bucket with junk by minting keys and uploading. The cost is borne by the storage provider, not by ohlify users. Acceptable for now; add a per-IP rate limit on the service if it becomes a problem.
- **Key-guessing.** Keys are random UUIDs (~122 bits of entropy) so guessing is infeasible. A leaked key gives an attacker a 1-hour read window via `/get-file-uri`. Treat keys as semi-secret, like API tokens — don't put them in URLs that get logged or shared.
- **Content validation.** The service does not inspect uploads. The ohlify backend should verify a key looks valid (matches `^[0-9a-f-]{36}\.(jpg|jpeg|png|webp|pdf)$`) before persisting it, and may optionally call `/get-file-uri` + HEAD the resulting URL to confirm the file actually exists at save time. See "Backend validation" below.

If this becomes inadequate, the service can grow an auth header check; that's a service-side change, not a client-side one.

---

## Backend validation

Whenever the ohlify backend accepts a `key` from a client, it should:

1. **Shape-check.** `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|pdf)$/`. Reject anything else as `validation_error`.
2. **Optional existence check.** Call `GET /get-file-uri?key=<key>`, then `HEAD` the returned `uri`. A 200 confirms the file is there; anything else means the client lied or the upload failed. Skip this for hot paths if performance matters; it's a useful sanity check on save endpoints.

The backend never stores the `uri` — only the `key`. Render-time URL minting is the consumer's job (web admin, mobile client).

---

## Allowed extensions

| Use case | Allowed exts |
|---|---|
| Profile avatar | `jpg`, `jpeg`, `png`, `webp` |
| KYC ID photo | `jpg`, `jpeg`, `png`, `pdf` |
| Selfie | `jpg`, `jpeg`, `png` |

The service itself accepts any extension; the constraint is enforced at the ohlify backend (in the zod schemas of the consuming endpoints).
