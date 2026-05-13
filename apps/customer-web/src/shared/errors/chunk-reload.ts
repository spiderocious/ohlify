/**
 * Hard-reloads the page exactly once when a chunk import fails, with a
 * sentinel in `sessionStorage` to prevent reload loops.
 *
 * Flow:
 *   1. Boundary / global handler detects a chunk-load error.
 *   2. Calls `attemptChunkReload()`. If no recent attempt → set sentinel +
 *      reload. If a recent attempt is already in flight → return `false` so
 *      the caller can render a "please refresh manually" fallback.
 *   3. After the reload, the next successful render calls
 *      `clearChunkReloadSentinel()` from the entrypoint so future deploys
 *      can retry cleanly.
 *
 * The 30s window is long enough to cover a slow reload but short enough
 * that a future legitimate chunk failure (a separate deploy hours later)
 * isn't suppressed.
 */
const SENTINEL_KEY = 'ohlify.chunkReloadAt';
const SENTINEL_WINDOW_MS = 30_000;

function readSentinel(): number | null {
  try {
    const raw = window.sessionStorage.getItem(SENTINEL_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function writeSentinel(at: number): void {
  try {
    window.sessionStorage.setItem(SENTINEL_KEY, String(at));
  } catch {
    // Storage unavailable (private mode, quota). The reload still works —
    // we just lose the loop guard, which is the safer failure mode.
  }
}

export function clearChunkReloadSentinel(): void {
  try {
    window.sessionStorage.removeItem(SENTINEL_KEY);
  } catch {
    // ignore
  }
}

/**
 * Returns `true` when a reload was triggered (caller can stop processing),
 * `false` when the sentinel suppressed a reload (caller should render a
 * "refresh manually" fallback instead).
 */
export function attemptChunkReload(): boolean {
  const last = readSentinel();
  const now = Date.now();
  if (last !== null && now - last < SENTINEL_WINDOW_MS) {
    // A reload already happened recently and the same error is still
    // showing — the server isn't serving a fixed bundle yet. Don't loop.
    return false;
  }
  writeSentinel(now);
  window.location.reload();
  return true;
}
