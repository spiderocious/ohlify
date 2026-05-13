/**
 * Single source of truth for whether the prefetch system runs. Read once at
 * module init so the rest of the system can branch on a constant.
 *
 * Anything in `shared/prefetch/` should bail out via this flag — both the
 * watcher (idle prefetch on route change) AND the `useLinkPrefetch` hover
 * hook. If the flag is off everything degrades to a no-op.
 */
export const PREFETCH_ENABLED: boolean = import.meta.env['VITE_ENABLE_PREFETCH'] === '1';
