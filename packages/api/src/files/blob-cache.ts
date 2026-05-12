/**
 * Persistent layer-2 cache: file-service `key` → file bytes, via the browser
 * Cache API.
 *
 * Why not just rely on HTTP caching? The presigned URL the file service
 * returns rotates every ~hour (the AWS signature changes). The browser keys
 * its HTTP cache by URL, so the cached bytes are evicted as soon as the
 * URI rotates — even though the underlying object hasn't changed. We work
 * around this by stashing the response under a stable synthetic URL keyed
 * on the file-service `key`, then handing consumers a blob URL pointing at
 * the cached body.
 *
 * The Cache API doesn't expose enumeration cleanly across browsers, so we
 * mirror the cache's keys in localStorage to drive LRU eviction.
 */

const CACHE_NAME = 'ohlify-files-v1';
const SYNTHETIC_PREFIX = 'https://ohlify.cache.local/files/';
const INDEX_STORAGE_KEY = 'ohlify:file-blob-cache-index:v1';
const MAX_ENTRIES = 300;

/** Active blob URLs we created — revoke when the entry is evicted. */
const liveBlobUrls = new Map<string, string>();

const isSupported = (): boolean =>
  typeof window !== 'undefined' && typeof window.caches !== 'undefined';

const syntheticUrlFor = (key: string): string => `${SYNTHETIC_PREFIX}${encodeURIComponent(key)}`;

// ── LRU index ────────────────────────────────────────────────────────────────

interface IndexEntry {
  /** ms-since-epoch of the last successful read. */
  lastReadAt: number;
}

type Index = Record<string, IndexEntry>;

let indexSnapshot: Index | null = null;

const loadIndex = (): Index => {
  if (indexSnapshot !== null) return indexSnapshot;
  if (typeof window === 'undefined') {
    indexSnapshot = {};
    return indexSnapshot;
  }
  try {
    const raw = window.localStorage.getItem(INDEX_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object') {
        indexSnapshot = parsed as Index;
        return indexSnapshot;
      }
    }
  } catch {
    // fall through
  }
  indexSnapshot = {};
  return indexSnapshot;
};

const flushIndex = (): void => {
  if (typeof window === 'undefined' || indexSnapshot === null) return;
  try {
    window.localStorage.setItem(INDEX_STORAGE_KEY, JSON.stringify(indexSnapshot));
  } catch {
    // Quota exceeded — non-fatal.
  }
};

const touchKey = (key: string): void => {
  const idx = loadIndex();
  idx[key] = { lastReadAt: Date.now() };
};

const evictColdEntries = async (): Promise<void> => {
  const idx = loadIndex();
  const keys = Object.keys(idx);
  if (keys.length <= MAX_ENTRIES) return;

  keys.sort((a, b) => (idx[a]?.lastReadAt ?? 0) - (idx[b]?.lastReadAt ?? 0));
  const toDrop = keys.slice(0, keys.length - MAX_ENTRIES);
  if (toDrop.length === 0) return;

  try {
    const cache = await window.caches.open(CACHE_NAME);
    await Promise.all(toDrop.map((k) => cache.delete(syntheticUrlFor(k))));
  } catch {
    // Silently drop — the index entry is gone either way.
  }
  for (const k of toDrop) {
    delete idx[k];
    const blobUrl = liveBlobUrls.get(k);
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      liveBlobUrls.delete(k);
    }
  }
  flushIndex();
};

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Look up a cached blob URL for the file. Returns the blob URL on hit, null
 * on miss. The blob URL is reused across renders — we only revoke it on
 * eviction, so consumers can hold the string for a component's lifetime.
 */
export async function readBlobUrl(key: string): Promise<string | null> {
  if (!isSupported()) return null;

  // If we already minted a blob URL this session, reuse it.
  const existing = liveBlobUrls.get(key);
  if (existing) {
    touchKey(key);
    flushIndex();
    return existing;
  }

  try {
    const cache = await window.caches.open(CACHE_NAME);
    const match = await cache.match(syntheticUrlFor(key));
    if (!match) return null;
    const blob = await match.blob();
    const url = URL.createObjectURL(blob);
    liveBlobUrls.set(key, url);
    touchKey(key);
    flushIndex();
    return url;
  } catch {
    return null;
  }
}

/**
 * Fetch the file via its presigned URL and stash the response under the
 * stable synthetic URL keyed on `key`. Returns the resulting blob URL on
 * success, null when the bytes can't be cached (CORS-opaque response,
 * file service down, etc.) — in that case the caller falls back to the
 * direct presigned URL.
 */
export async function cacheBlobFromUri(key: string, uri: string): Promise<string | null> {
  if (!isSupported()) return null;

  try {
    const res = await fetch(uri, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) return null;
    const cache = await window.caches.open(CACHE_NAME);
    // Clone before reading the body — the cache.put() consumes one branch.
    await cache.put(syntheticUrlFor(key), res.clone());
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    liveBlobUrls.set(key, url);
    touchKey(key);
    flushIndex();
    void evictColdEntries();
    return url;
  } catch {
    // CORS error / network error — caller falls back to the direct URI.
    return null;
  }
}

/**
 * Drop a single key from the bytes cache. Used when the URI cache expires
 * a key (rare — usually we just refresh the URI and keep the bytes).
 */
export async function forgetBlob(key: string): Promise<void> {
  if (!isSupported()) return;
  const idx = loadIndex();
  delete idx[key];
  flushIndex();
  const blobUrl = liveBlobUrls.get(key);
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl);
    liveBlobUrls.delete(key);
  }
  try {
    const cache = await window.caches.open(CACHE_NAME);
    await cache.delete(syntheticUrlFor(key));
  } catch {
    // Best effort.
  }
}

/**
 * Drop the entire bytes cache. Useful for "log out everywhere" or storage
 * pressure. Revokes all in-memory blob URLs too.
 */
export async function clearBlobCache(): Promise<void> {
  if (!isSupported()) return;
  for (const url of liveBlobUrls.values()) URL.revokeObjectURL(url);
  liveBlobUrls.clear();
  indexSnapshot = {};
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(INDEX_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  try {
    await window.caches.delete(CACHE_NAME);
  } catch {
    // ignore
  }
}
