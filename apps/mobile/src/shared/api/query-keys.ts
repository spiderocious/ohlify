/**
 * Every cached query key, in one place.
 *
 * The realtime invalidation map (`shared/realtime/realtime-events.ts`) targets
 * these by PREFIX, so the first segment of each key is what an SSE hint
 * invalidates. Keeping them declared together is what stops a new screen from
 * inventing a key no hint will ever reach — a cache that silently never
 * refreshes is worse than no cache.
 */
export const queryKeys = {
  home: () => ['home'] as const,
  badges: () => ['badges'] as const,
  notifications: () => ['notifications'] as const,

  me: () => ['me'] as const,
  meRates: () => ['me', 'rates'] as const,
  meBankAccount: () => ['me', 'bank-account'] as const,
  meBookingBlocks: () => ['me', 'booking-blocks'] as const,
  meNotificationPrefs: () => ['me', 'notification-prefs'] as const,

  wallet: () => ['wallet'] as const,
  walletTransactions: () => ['wallet-transactions'] as const,
  withdrawal: (id: string) => ['wallet', 'withdrawal', id] as const,

  minutes: () => ['minutes'] as const,
  minutesFor: (professionalId: string, callType: string) =>
    ['minutes', professionalId, callType] as const,

  calls: () => ['calls'] as const,
  callHistory: () => ['calls', 'history'] as const,

  chat: () => ['chat'] as const,
  conversations: () => ['chat', 'conversations'] as const,
  conversationContext: (id: string) => ['chat', 'context', id] as const,
  conversationMessages: (id: string) => ['chat', 'messages', id] as const,

  professionals: () => ['professionals'] as const,
  professional: (id: string) => ['professionals', id] as const,
  professionalRates: (id: string) => ['professionals', id, 'rates'] as const,
  professionalReviews: (id: string) => ['professionals', id, 'reviews'] as const,

  support: () => ['support'] as const,
} as const;
