import { redis } from '@lib/redis/client.js';

import { PaystackUnresolvableError, PaystackUpstreamError, resolveBankAccount } from './client.js';

const RESOLVE_CACHE_TTL = 60;
const UNRESOLVABLE_SENTINEL = '__unresolvable__';

const cacheKey = (bankCode: string, accountNumber: string): string =>
  `bank-resolve:${bankCode}:${accountNumber}`;

// Resolves a bank account via Paystack with a 60s positive AND negative Redis
// cache. Throws PaystackUnresolvableError (terminal — cached) or
// PaystackUpstreamError (transient — not cached). Used by both
// GET /banks/resolve and PUT /me/bank-account so the typical mobile flow
// (resolve-on-type → PUT-on-submit) only hits Paystack once.
export const resolveBankAccountCached = async (
  accountNumber: string,
  bankCode: string,
): Promise<{ accountName: string }> => {
  const key = cacheKey(bankCode, accountNumber);
  const cached = await redis.get(key);
  if (cached !== null) {
    if (cached === UNRESOLVABLE_SENTINEL) {
      throw new PaystackUnresolvableError('cached unresolvable');
    }
    return { accountName: cached };
  }

  try {
    const { account_name } = await resolveBankAccount(accountNumber, bankCode);
    await redis.setex(key, RESOLVE_CACHE_TTL, account_name);
    return { accountName: account_name };
  } catch (err) {
    if (err instanceof PaystackUnresolvableError) {
      await redis.setex(key, RESOLVE_CACHE_TTL, UNRESOLVABLE_SENTINEL);
    }
    // Upstream errors NOT cached — caller retries.
    throw err;
  }
};

export { PaystackUnresolvableError, PaystackUpstreamError };
