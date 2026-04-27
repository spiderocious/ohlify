import { invalidate } from '@lib/cache/responseCache.js';

// Per-pro cache keys used by the professionals feature. Centralized so callers
// from other features (onboarding, rates) can bust them without reaching into
// the service.
export const cacheKeys = {
  detail: (userId: string): string => `prof:detail:${userId}`,
  rates: (userId: string): string => `prof:rates:${userId}`,
  reviewsEmpty: (userId: string): string => `prof:reviews:${userId}:empty`,
  home: (userId: string): string => `home:${userId}`,
};

// Busts every per-user cache that depends on the visibility predicate or the
// pro's own data. Called when:
// - kyc_status flips (approve / demote)
// - rates are mutated
// - bank-account is added/removed (affects KYC completeness)
// Per-query list caches (`prof:list:*`) aren't busted here — they're query-
// hashed and naturally expire in 120s. Acceptable lag.
export const invalidateProfessionalCaches = async (userId: string): Promise<void> => {
  await invalidate(
    cacheKeys.detail(userId),
    cacheKeys.rates(userId),
    cacheKeys.reviewsEmpty(userId),
    cacheKeys.home(userId),
  );
};
