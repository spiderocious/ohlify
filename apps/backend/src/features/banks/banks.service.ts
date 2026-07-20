import { listBanksCached } from '@lib/paystack/list-banks-cached.js';
import {
  PaystackUnresolvableError,
  PaystackUpstreamError,
  resolveBankAccountCached,
} from '@lib/paystack/resolve-cached.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';

import { BANKS_MESSAGES } from './banks.messages.js';
import type { ResolveAccountQuery } from './banks.schema.js';
import type { BankView, ResolveAccountView } from './banks.types.js';

const toView = (bank: { code: string; name: string }): BankView => ({
  code: bank.code,
  name: bank.name,
  logo_url: null,
});

export const listBanks = async () => {
  const { banks } = await listBanksCached();
  const view = banks
    .filter((b) => b.active)
    .map(toView)
    .sort((a, b) => a.name.localeCompare(b.name));
  return new ServiceSuccess(view, BANKS_MESSAGES.LIST_FETCHED);
};

// Used by GET /banks for ETag computation. Returns null when the cache and
// upstream are both empty (no fingerprint to serve).
export const banksFingerprint = async (): Promise<string | null> => {
  try {
    const { syncedAt } = await listBanksCached();
    return syncedAt;
  } catch {
    return null;
  }
};

export const resolveAccount = async (dto: ResolveAccountQuery) => {
  const { banks } = await listBanksCached();
  const bank = banks.find((b) => b.code === dto.bank_code && b.active);
  if (!bank) {
    return new ServiceError('bank_not_found', BANKS_MESSAGES.BANK_NOT_FOUND, 422);
  }

  try {
    const { accountName } = await resolveBankAccountCached(dto.account_number, dto.bank_code);
    const view: ResolveAccountView = { account_name: accountName };
    return new ServiceSuccess(view, BANKS_MESSAGES.ACCOUNT_RESOLVED);
  } catch (err) {
    if (err instanceof PaystackUnresolvableError) {
      return new ServiceError('unresolvable_account', BANKS_MESSAGES.ACCOUNT_UNRESOLVABLE, 422);
    }
    if (err instanceof PaystackUpstreamError) {
      return new ServiceError(
        'upstream_unavailable',
        BANKS_MESSAGES.UPSTREAM_ERROR,
        502,
        undefined,
        5,
      );
    }
    throw err;
  }
};
