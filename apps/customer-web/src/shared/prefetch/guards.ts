import { PREFETCH_ENABLED } from './config.js';

/**
 * Cheap, runtime-only guards. Each prefetch call funnels through
 * `canPrefetch()` so we never compete with the user's actual interaction.
 *
 * Order matters — flag check first (zero cost), then network/visibility
 * (free reads), then concurrency cap (uses our own counter).
 */

interface NetworkInformation {
  saveData?: boolean;
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
}

const MAX_CONCURRENT = 3;
let inflight = 0;

function isSlowNetwork(): boolean {
  const conn = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  if (!conn) return false;
  if (conn.saveData) return true;
  if (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g') return true;
  return false;
}

function isTabHidden(): boolean {
  return typeof document !== 'undefined' && document.visibilityState !== 'visible';
}

export function canPrefetch(): boolean {
  if (!PREFETCH_ENABLED) return false;
  if (isTabHidden()) return false;
  if (isSlowNetwork()) return false;
  if (inflight >= MAX_CONCURRENT) return false;
  return true;
}

/**
 * Wraps a prefetch task with the concurrency counter so we cap inflight
 * work. Failures are swallowed — prefetch is best-effort by definition.
 */
export async function withSlot<T>(run: () => Promise<T>): Promise<T | undefined> {
  if (!canPrefetch()) return undefined;
  inflight += 1;
  try {
    return await run();
  } catch {
    return undefined;
  } finally {
    inflight = Math.max(0, inflight - 1);
  }
}

/**
 * Schedules `run` for an idle moment. Falls back to setTimeout where
 * requestIdleCallback isn't available (Safari < 16.4). The 2s timeout
 * keeps prefetches from starving forever on a busy main thread.
 */
export function onIdle(run: () => void): () => void {
  const w = window as typeof window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
  };
  if (w.requestIdleCallback) {
    const handle = w.requestIdleCallback(run, { timeout: 2000 });
    return () => w.cancelIdleCallback?.(handle);
  }
  const handle = window.setTimeout(run, 200);
  return () => window.clearTimeout(handle);
}
