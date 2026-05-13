/**
 * Heuristics for detecting a dynamic-import failure. Different bundlers /
 * browsers surface this with different shapes:
 *
 *   - Vite + modern browsers throw a plain `TypeError` whose message
 *     mentions "Failed to fetch dynamically imported module" or
 *     "error loading dynamically imported module".
 *   - Safari surfaces "Importing a module script failed".
 *   - Webpack apps set `error.name === 'ChunkLoadError'` (kept for forward
 *     compat in case we bundle anything with webpack later).
 *
 * A false positive here is harmless — it'd just trigger a single sentinel-
 * protected reload, and the sentinel guard prevents a loop.
 */
const CHUNK_MESSAGE_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
  /Loading chunk \d+ failed/i,
];

export function isChunkLoadError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const e = error as { name?: string; message?: string };
  if (e.name === 'ChunkLoadError') return true;
  if (typeof e.message === 'string') {
    return CHUNK_MESSAGE_PATTERNS.some((re) => re.test(e.message!));
  }
  return false;
}
