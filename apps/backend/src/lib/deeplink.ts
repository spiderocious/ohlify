/**
 * Deeplink targets a notification, banner, or push can point at.
 *
 * Mirrors `packages/core/src/deeplinks/deeplink.ts` — the backend does not
 * depend on `@ohlify/core`, and these tokens are a wire contract stored in rows
 * that outlive any app build, so the two lists must agree. Change both together.
 *
 * The client owns decoding and its own fallbacks; the server only ever writes.
 */
export const DeeplinkTarget = {
  HOME: 'home',
  CALLS: 'calls',
  CHATS: 'chats',
  CHAT_THREAD: 'chat_thread',
  WALLET: 'wallet',
  WALLET_TRANSACTION: 'wallet_transaction',
  WITHDRAWALS: 'withdrawals',
  NOTIFICATIONS: 'notifications',
  PROFILE: 'profile',
  PROFILE_RATES: 'profile_rates',
  PROFILE_BANK_ACCOUNT: 'profile_bank_account',
  PROFESSIONAL: 'professional',
  PROFESSIONAL_SEARCH: 'professional_search',
  CALL_DETAIL: 'call_detail',
  KYC: 'kyc',
  STRIKES: 'strikes',
  SUPPORT: 'support',
  EXTERNAL: 'external',
} as const;

export type DeeplinkTarget = (typeof DeeplinkTarget)[keyof typeof DeeplinkTarget];

export interface Deeplink {
  target: DeeplinkTarget;
  params?: Record<string, string>;
}

/** Serialises to `target?key=value` — a flat string, so push payloads carry it unchanged. */
export const encodeDeeplink = (link: Deeplink): string => {
  const entries = Object.entries(link.params ?? {});
  if (entries.length === 0) return link.target;
  const query = entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return `${link.target}?${query}`;
};
