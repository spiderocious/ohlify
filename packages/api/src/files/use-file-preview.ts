import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { getViewUri } from './file-service.js';
import {
  cacheBlobFromUri,
  forgetBlob,
  readBlobUrl,
} from './blob-cache.js';
import {
  forgetUri,
  lookupUri,
  parseExpiresInToSeconds,
  setUriEntry,
} from './uri-cache.js';

export interface UseFilePreviewOptions {
  /** File-service key (e.g. `8204e793-….jpg`). Pass null/undefined to disable. */
  key: string | null | undefined;
  /**
   * When true, skip both caches: always re-mint the presigned URL and never
   * write to the bytes cache. The returned `uri` is the live presigned URL.
   * Useful for one-off downloads or admin tools that must show fresh state.
   * Default: `false`.
   */
  noCache?: boolean;
}

export interface UseFilePreviewResult {
  /**
   * URL ready for `<img src>` / `<a href>`. May be a blob URL (when the
   * bytes cache has the file) or the file service's presigned URL.
   */
  uri: string | undefined;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Resolves a file-service key for rendering. Two cache layers in front of
 * the network:
 *
 *   1. URI cache (localStorage LRU, 5-min safety buffer) — keyed on the
 *      file-service `key`, holds the latest presigned URL until close to
 *      expiry. Survives page refreshes.
 *   2. Bytes cache (Cache API, blob URLs) — same key, holds the actual
 *      file. Survives URI rotation; the next render of the same key
 *      doesn't hit the network even if the URI signature has rotated.
 *
 * On a cold key the hook:
 *   - Mints a presigned URI via `getViewUri`.
 *   - Persists the URI in layer 1.
 *   - Tries `fetch(uri)` and stashes the response in layer 2. If the fetch
 *     fails (CORS, network), we still return the presigned URI so the
 *     consumer renders something — just without the bytes-cache benefit.
 *
 * Pass `noCache: true` to skip both layers entirely.
 */
export function useFilePreview(
  optsOrKey: UseFilePreviewOptions | string | null | undefined,
): UseFilePreviewResult {
  // Normalize the parameter — accept either a bare key (legacy) or an opts object.
  const opts: UseFilePreviewOptions =
    typeof optsOrKey === 'string' || optsOrKey === null || optsOrKey === undefined
      ? { key: optsOrKey ?? null }
      : optsOrKey;
  const { key, noCache = false } = opts;

  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  // ── Layer 1: URI cache ────────────────────────────────────────────────────
  const cachedUri = key && !noCache ? lookupUri(key) : null;

  const q = useQuery({
    queryKey: ['file-preview', key, noCache],
    queryFn: async () => {
      const res = await getViewUri(key!);
      if (!noCache) {
        setUriEntry(
          key!,
          res.uri,
          parseExpiresInToSeconds(res.expires_in),
        );
      }
      return res;
    },
    enabled: Boolean(key) && cachedUri === null,
    staleTime: 50 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: false,
  });

  const presignedUri = cachedUri ?? q.data?.uri;

  // ── Layer 2: bytes cache ──────────────────────────────────────────────────
  useEffect(() => {
    if (!key || noCache) {
      // noCache disables both layers. Drop any blob URL we held for this key.
      if (blobUrl) {
        setBlobUrl(null);
      }
      return;
    }

    let cancelled = false;

    const run = async () => {
      // Try the bytes cache first.
      const existing = await readBlobUrl(key);
      if (cancelled) return;
      if (existing) {
        setBlobUrl(existing);
        return;
      }

      // Cache miss — wait until we have a presigned URI to fetch from.
      if (!presignedUri) return;

      const minted = await cacheBlobFromUri(key, presignedUri);
      if (cancelled) return;
      if (minted) {
        setBlobUrl(minted);
      }
      // If minting failed (CORS / network), we leave blobUrl null and the
      // consumer falls back to `presignedUri`.
    };

    void run();
    return () => {
      cancelled = true;
    };
    // We intentionally re-run whenever the key changes OR the presigned URI
    // first arrives. We don't track blobUrl in deps — that would loop.
  }, [key, noCache, presignedUri]);

  // If we held a blob URL for a previous key, clear it when the key changes.
  useEffect(() => {
    setBlobUrl(null);
  }, [key]);

  const uri = blobUrl ?? presignedUri;

  // The hook is "loading" only when we have nothing to render at all. As
  // soon as either layer (cached URI, fresh URI, or blob URL) lands, we
  // surface it and let the consumer hide the spinner.
  const isLoading = Boolean(key) && !uri && (q.isLoading || q.isFetching);

  return {
    uri,
    isLoading,
    error: (q.error as Error | null) ?? null,
  };
}

/**
 * Forces both caches to drop a key. Use after the user explicitly replaces
 * a file (avatar upload, ID re-submission) so consumers re-fetch the bytes.
 */
export async function invalidateFilePreview(key: string): Promise<void> {
  forgetUri(key);
  await forgetBlob(key);
}
