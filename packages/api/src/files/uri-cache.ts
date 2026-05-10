/**
 * Persistent layer-1 cache: file-service `key` → presigned GET URL.
 *
 * The Go file service mints URLs that expire in ~1 hour. Re-fetching the same
 * URL multiple times across page reloads / tab switches wastes a network
 * round-trip per render. We persist `(key → uri, expiresAt)` in localStorage
 * so a refresh rehydrates instantly.
 *
 * Tiny LRU on top to keep storage bounded — entries are small (<400 bytes
 * each) but pages with infinite-scroll lists can still produce thousands of
 * keys over time. Cap at 500 entries.
 *
 * Layer 2 (the actual file bytes) lives in `blob-cache.ts` and uses the
 * browser's Cache API.
 */

interface UriEntry {
  /** Presigned GET URL — expires when `expiresAt` passes. */
  uri: string;
  /** ms-since-epoch when the URI is no longer signed for. */
  expiresAt: number;
  /** Bumped on every read so the LRU sweep evicts the cold entries first. */
  lastReadAt: number;
}

const STORAGE_KEY = 'ohlify:file-uri-cache:v1';
const MAX_ENTRIES = 500;
/** Treat URIs whose remaining life is below this as already expired. */
const SAFETY_BUFFER_MS = 5 * 60 * 1000;

type Store = Record<string, UriEntry>;

const isBrowser = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

/** Last-known disk snapshot, mirrored in memory so reads stay synchronous. */
let memSnapshot: Store | null = null;

const loadFromDisk = (): Store => {
  if (memSnapshot !== null) return memSnapshot;
  if (!isBrowser()) {
    memSnapshot = {};
    return memSnapshot;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      memSnapshot = {};
      return memSnapshot;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') {
      memSnapshot = parsed as Store;
      return memSnapshot;
    }
  } catch {
    // localStorage corrupted or quota error — fall through to empty.
  }
  memSnapshot = {};
  return memSnapshot;
};

const flushToDisk = (store: Store): void => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Quota / private mode — silently drop.
  }
};

const evictIfNeeded = (store: Store): void => {
  const keys = Object.keys(store);
  if (keys.length <= MAX_ENTRIES) return;
  // Sort by lastReadAt ascending and drop the cold tail.
  keys.sort((a, b) => (store[a]?.lastReadAt ?? 0) - (store[b]?.lastReadAt ?? 0));
  const toDrop = keys.slice(0, keys.length - MAX_ENTRIES);
  for (const k of toDrop) delete store[k];
};

/**
 * Look up a fresh URI for a key. Returns null when the key is unknown OR the
 * URI is within `SAFETY_BUFFER_MS` of expiring (better to re-mint than serve
 * a doomed URL). Updates `lastReadAt` on hits so the LRU works.
 */
export function lookupUri(key: string): string | null {
  const store = loadFromDisk();
  const entry = store[key];
  if (!entry) return null;
  if (entry.expiresAt - Date.now() < SAFETY_BUFFER_MS) {
    delete store[key];
    flushToDisk(store);
    return null;
  }
  entry.lastReadAt = Date.now();
  // Don't flush every hit — the LRU sort survives until the next miss/set,
  // and over-flushing burns disk for no visible win. flush() runs on writes.
  return entry.uri;
}

/**
 * Persist a freshly-minted URI for `key`. `expiresInSeconds` is parsed from
 * the file service's `expires_in` string (e.g. "1h", "15m"). Anything we
 * can't parse falls back to 1h.
 */
export function setUriEntry(key: string, uri: string, expiresInSeconds: number): void {
  const store = loadFromDisk();
  const expiresAt = Date.now() + expiresInSeconds * 1000;
  store[key] = { uri, expiresAt, lastReadAt: Date.now() };
  evictIfNeeded(store);
  flushToDisk(store);
}

/** Drop a single key from the cache (used when the bytes-cache evicts it). */
export function forgetUri(key: string): void {
  const store = loadFromDisk();
  if (!(key in store)) return;
  delete store[key];
  flushToDisk(store);
}

/** Returns the keys currently held by the LRU, ordered hottest-first. */
export function listCachedKeys(): string[] {
  const store = loadFromDisk();
  return Object.keys(store).sort(
    (a, b) => (store[b]?.lastReadAt ?? 0) - (store[a]?.lastReadAt ?? 0),
  );
}

/**
 * Parse strings like "1h", "30m", "45s", "1h30m" into seconds. Falls back
 * to the supplied default. Resilient to weird formats.
 */
export function parseExpiresInToSeconds(raw: string | undefined, fallback = 3600): number {
  if (!raw) return fallback;
  const match = raw.match(/(\d+)\s*([hms])/gi);
  if (!match) {
    // Maybe a plain number of seconds.
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
  }
  let total = 0;
  for (const part of match) {
    const m = part.match(/(\d+)\s*([hms])/i);
    if (!m) continue;
    const n = Number(m[1]);
    const unit = m[2]!.toLowerCase();
    if (!Number.isFinite(n)) continue;
    if (unit === 'h') total += n * 3600;
    else if (unit === 'm') total += n * 60;
    else total += n;
  }
  return total > 0 ? total : fallback;
}
