import AsyncStorage from '@react-native-async-storage/async-storage';

import { fileUploadService } from './file-upload-service';

/**
 * key -> presigned GET URI cache. Mirrors mobile/lib/shared/files/uri_cache.dart
 * — two-layer (in-memory + AsyncStorage-persisted) cache, capped entries,
 * evicts within a safety buffer of expiry so a render never gets handed an
 * about-to-expire URL.
 */
const STORAGE_KEY = 'uri_cache_v1';
const MAX_ENTRIES = 500;
const SAFETY_BUFFER_MS = 5 * 60 * 1000;
const DEFAULT_TTL_MS = 60 * 60 * 1000;

interface CacheEntry {
  uri: string;
  expiresAt: number;
}

let memoryCache: Map<string, CacheEntry> | null = null;
let loadPromise: Promise<Map<string, CacheEntry>> | null = null;

async function loadCache(): Promise<Map<string, CacheEntry>> {
  if (memoryCache) return memoryCache;
  if (!loadPromise) {
    loadPromise = AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return new Map<string, CacheEntry>();
        try {
          const parsed = JSON.parse(raw) as Record<string, CacheEntry>;
          return new Map(Object.entries(parsed));
        } catch {
          return new Map<string, CacheEntry>();
        }
      })
      .then((map) => {
        memoryCache = map;
        return map;
      });
  }
  return loadPromise;
}

function persist(cache: Map<string, CacheEntry>) {
  const obj = Object.fromEntries(cache);
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(obj)).catch(() => {
    // Best-effort — in-memory cache still works for this session.
  });
}

function evictOldest(cache: Map<string, CacheEntry>) {
  while (cache.size > MAX_ENTRIES) {
    let oldestKey: string | undefined;
    let oldestExpiry = Infinity;
    for (const [k, v] of cache) {
      if (v.expiresAt < oldestExpiry) {
        oldestExpiry = v.expiresAt;
        oldestKey = k;
      }
    }
    if (!oldestKey) break;
    cache.delete(oldestKey);
  }
}

async function mintViewUri(key: string): Promise<string> {
  const cache = await loadCache();
  const cached = cache.get(key);
  if (cached && cached.expiresAt - SAFETY_BUFFER_MS > Date.now()) {
    return cached.uri;
  }
  const uri = await fileUploadService.getViewUri(key);
  cache.set(key, { uri, expiresAt: Date.now() + DEFAULT_TTL_MS });
  evictOldest(cache);
  persist(cache);
  return uri;
}

async function evict(key: string): Promise<void> {
  const cache = await loadCache();
  if (cache.delete(key)) persist(cache);
}

export const fileService = { mintViewUri, evict };
