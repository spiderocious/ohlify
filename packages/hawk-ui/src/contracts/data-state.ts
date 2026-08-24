/**
 * The freshness contract. CONTRACTS §10.
 *
 * Offline-first means **stale is a first-class state**, not an error. Every
 * data-bearing component supports four:
 *
 * - `loading` — nothing yet; render the component's own skeleton
 * - `fresh`   — live data
 * - `stale`   — cached, with an age
 * - `empty`   — loaded successfully, nothing to show
 *
 * Errors are separate and **non-blocking when cached data exists**: a thin
 * banner ("Showing saved data · last refreshed 4 min ago"), never a full-screen
 * error that discards data the user could still read. A full error state
 * belongs only to a cold cache.
 */
export const HawkDataState = {
  LOADING: 'loading',
  FRESH: 'fresh',
  STALE: 'stale',
  EMPTY: 'empty',
} as const;
export type HawkDataState = (typeof HawkDataState)[keyof typeof HawkDataState];

export const HAWK_DATA_STATES: readonly HawkDataState[] = [
  HawkDataState.LOADING,
  HawkDataState.FRESH,
  HawkDataState.STALE,
  HawkDataState.EMPTY,
];

/** Whether the component should render its own skeleton rather than content. */
export function showsSkeleton(state: HawkDataState): boolean {
  return state === HawkDataState.LOADING;
}

/** Whether real content is available to render. */
export function hasContent(state: HawkDataState): boolean {
  return state === HawkDataState.FRESH || state === HawkDataState.STALE;
}

/**
 * Whether an error should be rendered as a full replacement of the content.
 *
 * Only on a cold cache. With cached data present the error is a thin banner
 * over data the user keeps — discarding readable data to show an error message
 * is the failure this rule prevents.
 */
export function errorIsBlocking(state: HawkDataState): boolean {
  return !hasContent(state);
}

/**
 * Human-readable freshness, e.g. "4 min ago".
 *
 * Deliberately coarse. A cached balance that claims "3 seconds ago" invites
 * exactly the trust the freshness contract is trying to withhold.
 */
export function formatAge(ageMs: number): string {
  if (ageMs < 60_000) return 'just now';
  const minutes = Math.floor(ageMs / 60_000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

/**
 * Balances are cached-but-never-trusted-for-action. CONTRACTS §10.
 *
 * You may browse a balance offline; you may not start a call on one. Call-start
 * CTAs require a live preflight, so a stale balance must disable them rather
 * than let the user commit money against a number that may have moved.
 */
export function canActOnBalance(state: HawkDataState): boolean {
  return state === HawkDataState.FRESH;
}
