import { logger } from '@lib/logger.js';
import { redis } from '@lib/redis/client.js';

import { listBanks, PaystackUpstreamError, type PaystackBank } from './client.js';

// 24h fresh window; Paystack updates the list rarely.
const LIST_CACHE_TTL_SECONDS = 24 * 60 * 60;
// If Paystack is down and we still have a stored entry, serve it for up to a
// week rather than 502ing the whole app (KYC would be blocked otherwise).
const LIST_STALE_TTL_SECONDS = 7 * 24 * 60 * 60;

const LIST_CACHE_KEY = 'paystack:banks:list:v1';

export interface CachedBankList {
  banks: PaystackBank[];
  syncedAt: string; // ISO — feeds ETag fingerprint on GET /banks
}

interface StoredPayload {
  banks: PaystackBank[];
  synced_at: string;
}

const readStored = async (): Promise<StoredPayload | null> => {
  const raw = await redis.get(LIST_CACHE_KEY);
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as StoredPayload;
    if (!Array.isArray(parsed.banks) || typeof parsed.synced_at !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeStored = async (payload: StoredPayload): Promise<void> => {
  // Store with the stale TTL; a companion "freshness" key expires sooner. This
  // lets us differentiate "cached & fresh" (skip upstream) from "cached but
  // stale" (try upstream, fall back on failure).
  await redis.setex(LIST_CACHE_KEY, LIST_STALE_TTL_SECONDS, JSON.stringify(payload));
  await redis.setex(`${LIST_CACHE_KEY}:fresh`, LIST_CACHE_TTL_SECONDS, '1');
};

const isFresh = async (): Promise<boolean> => {
  const v = await redis.get(`${LIST_CACHE_KEY}:fresh`);
  return v !== null;
};

// Lists banks with a 24h Redis cache + stale-while-error fallback. On upstream
// failure with a prior entry, serves the stale copy and logs a warning; only
// throws PaystackUpstreamError when there is nothing cached at all.
export const listBanksCached = async (): Promise<CachedBankList> => {
  const stored = await readStored();
  if (stored !== null && (await isFresh())) {
    return { banks: stored.banks, syncedAt: stored.synced_at };
  }

  try {
    const fresh = await listBanks();
    const payload: StoredPayload = { banks: fresh, synced_at: new Date().toISOString() };
    await writeStored(payload);
    return { banks: payload.banks, syncedAt: payload.synced_at };
  } catch (err) {
    if (stored !== null) {
      logger.warn({ err }, 'paystack /bank upstream failed — serving stale cache');
      return { banks: stored.banks, syncedAt: stored.synced_at };
    }
    if (err instanceof PaystackUpstreamError) throw err;
    throw err;
  }
};
