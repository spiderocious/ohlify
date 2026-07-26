/**
 * The canonical set of places a notification, banner, or push can point at.
 *
 * This is a CONTRACT, not a route table. The backend stores these strings in
 * notification rows and campaign records that outlive any given app build, so
 * the tokens must stay stable even when screens are renamed or re-nested —
 * which is exactly why they are not derived from `ROUTES`.
 *
 * Each surface resolves a target to its own navigation. A target the installed
 * build does not recognise falls back rather than crashing, so an older client
 * receiving a newer deeplink still opens something sensible.
 */

export const DeeplinkTarget = {
  HOME: 'home',
  CALLS: 'calls',
  CHATS: 'chats',
  /** Requires `conversation_id`. */
  CHAT_THREAD: 'chat_thread',
  WALLET: 'wallet',
  /** Requires `transaction_id`. */
  WALLET_TRANSACTION: 'wallet_transaction',
  WITHDRAWALS: 'withdrawals',
  NOTIFICATIONS: 'notifications',
  PROFILE: 'profile',
  PROFILE_RATES: 'profile_rates',
  PROFILE_BANK_ACCOUNT: 'profile_bank_account',
  /** Requires `professional_id`. */
  PROFESSIONAL: 'professional',
  PROFESSIONAL_SEARCH: 'professional_search',
  /** Requires `call_id`. */
  CALL_DETAIL: 'call_detail',
  KYC: 'kyc',
  STRIKES: 'strikes',
  SUPPORT: 'support',
  /** Opens `url` outside the app. */
  EXTERNAL: 'external',
} as const;

export type DeeplinkTarget = (typeof DeeplinkTarget)[keyof typeof DeeplinkTarget];

export interface Deeplink {
  target: DeeplinkTarget;
  /** Ids the target needs. Absent params make a link fall back to its parent surface. */
  params?: Record<string, string>;
}

const TARGETS = new Set<string>(Object.values(DeeplinkTarget));

/** Params each target cannot resolve without. */
const REQUIRED_PARAMS: Partial<Record<DeeplinkTarget, readonly string[]>> = {
  [DeeplinkTarget.CHAT_THREAD]: ['conversation_id'],
  [DeeplinkTarget.WALLET_TRANSACTION]: ['transaction_id'],
  [DeeplinkTarget.PROFESSIONAL]: ['professional_id'],
  [DeeplinkTarget.CALL_DETAIL]: ['call_id'],
  [DeeplinkTarget.EXTERNAL]: ['url'],
};

/** Where a target falls back when its params are missing or it is unrecognised. */
const FALLBACKS: Partial<Record<DeeplinkTarget, DeeplinkTarget>> = {
  [DeeplinkTarget.CHAT_THREAD]: DeeplinkTarget.CHATS,
  [DeeplinkTarget.WALLET_TRANSACTION]: DeeplinkTarget.WALLET,
  [DeeplinkTarget.PROFESSIONAL]: DeeplinkTarget.PROFESSIONAL_SEARCH,
  [DeeplinkTarget.CALL_DETAIL]: DeeplinkTarget.CALLS,
};

/**
 * Serialises to `target?key=value`, the form stored on notification rows.
 *
 * A flat string rather than JSON so it survives push payloads, which are
 * string-only, without a second encoding.
 */
export function encodeDeeplink(link: Deeplink): string {
  const entries = Object.entries(link.params ?? {});
  if (entries.length === 0) return link.target;
  const query = entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return `${link.target}?${query}`;
}

/**
 * Parses a stored deeplink, degrading rather than throwing.
 *
 * Returns HOME for anything unrecognised, and falls back to the parent surface
 * when a target is missing the params it needs — an older build must still open
 * *something* when handed a link written by a newer server.
 */
export function decodeDeeplink(raw: string | null | undefined): Deeplink {
  if (!raw) return { target: DeeplinkTarget.HOME };

  const [rawTarget = '', rawQuery = ''] = raw.split('?');
  if (!TARGETS.has(rawTarget)) return { target: DeeplinkTarget.HOME };

  const target = rawTarget as DeeplinkTarget;
  const params: Record<string, string> = {};
  if (rawQuery) {
    for (const pair of rawQuery.split('&')) {
      const [k = '', v = ''] = pair.split('=');
      if (k) params[decodeURIComponent(k)] = decodeURIComponent(v);
    }
  }

  const required = REQUIRED_PARAMS[target] ?? [];
  const satisfied = required.every((key) => typeof params[key] === 'string' && params[key] !== '');
  if (!satisfied) return { target: FALLBACKS[target] ?? DeeplinkTarget.HOME };

  return Object.keys(params).length > 0 ? { target, params } : { target };
}
