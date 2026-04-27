import {
  PaystackUnresolvableError,
  PaystackUpstreamError,
  resolveBankAccountCached,
} from '@lib/paystack/resolve-cached.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';

import { BANKS_MESSAGES } from './banks.messages.js';
import * as repo from './banks.repo.js';
import type { ResolveAccountQuery } from './banks.schema.js';
import type { BankView, ResolveAccountView } from './banks.types.js';

const toView = (row: { code: string; name: string; logo_url: string | null }): BankView => ({
  code: row.code,
  name: row.name,
  logo_url: row.logo_url,
});

export const listBanks = async () => {
  const rows = await repo.findAllActive();
  return new ServiceSuccess(rows.map(toView), BANKS_MESSAGES.LIST_FETCHED);
};

// Used by GET /banks for ETag computation. Returns null when no banks loaded.
export const banksFingerprint = async (): Promise<string | null> => {
  const max = await repo.maxSyncedAt();
  return max ? max.toISOString() : null;
};

export const resolveAccount = async (dto: ResolveAccountQuery) => {
  const bank = await repo.findActiveByCode(dto.bank_code);
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
