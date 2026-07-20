import { apiClient } from '@shared/api/api-client';

import { bankAccountFromJson, bankFromJson, type Bank, type BankAccount } from '../types/me-models';

/** Mirrors mobile/lib/features/me/banks_api.dart's BanksApiHttp. */
export const banksApi = {
  listBanks(): Promise<Bank[]> {
    return apiClient.get('banks', {
      fromJson: (data) => (data as unknown[]).map((e) => bankFromJson(e as Record<string, unknown>)),
    });
  },

  resolveAccount(params: { accountNumber: string; bankCode: string }): Promise<string> {
    return apiClient.get('banks/resolve', {
      queryParams: { account_number: params.accountNumber, bank_code: params.bankCode },
      fromJson: (data) => (data as Record<string, unknown>).account_name as string,
    });
  },

  getMyBankAccount(): Promise<BankAccount | null> {
    return apiClient.get('me/bank-account', {
      fromJson: (data) => (data ? bankAccountFromJson(data as Record<string, unknown>) : null),
    });
  },

  saveBankAccount(params: { accountNumber: string; bankCode: string }): Promise<BankAccount> {
    return apiClient.put(
      'me/bank-account',
      { account_number: params.accountNumber, bank_code: params.bankCode },
      { fromJson: (data) => bankAccountFromJson(data as Record<string, unknown>) },
    );
  },

  deleteBankAccount(): Promise<void> {
    return apiClient.delete('me/bank-account', { fromJson: () => undefined });
  },
};
