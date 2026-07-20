import { apiClient } from '@shared/api/api-client';

import type { CursorPage } from '@features/calls/types/call-models';

import {
  fundInitResponseFromJson,
  fundVerifyResponseFromJson,
  walletBalanceFromJson,
  walletStatsFromJson,
  walletTransactionFromJson,
  withdrawalResponseFromJson,
  type FundInitResponse,
  type FundVerifyResponse,
  type WalletBalance,
  type WalletStats,
  type WalletTransaction,
  type WithdrawalResponse,
} from '../types/wallet-models';

/** Mirrors mobile/lib/features/wallet/wallet_api.dart's WalletApiHttp. */
export const walletApi = {
  async getWallet(): Promise<WalletBalance> {
    return apiClient.get('wallet', { fromJson: (data) => walletBalanceFromJson(data as Record<string, unknown>) }) as Promise<WalletBalance>;
  },

  async getStats(): Promise<WalletStats> {
    return apiClient.get('wallet/stats', {
      fromJson: (data) => walletStatsFromJson(data as Record<string, unknown>),
    }) as Promise<WalletStats>;
  },

  async getTransactions(params?: { cursor?: string; limit?: number }): Promise<CursorPage<WalletTransaction>> {
    return apiClient.get('wallet/transactions', {
      queryParams: { limit: params?.limit ?? 20, cursor: params?.cursor },
      fromJson: (data) => {
        const map = data as Record<string, unknown>;
        const items = (Array.isArray(map.data) ? map.data : []).map((e) => walletTransactionFromJson(e as Record<string, unknown>));
        const meta = (map.meta as Record<string, unknown>) ?? {};
        return { items, nextCursor: meta.next_cursor as string | undefined, hasMore: (meta.has_more as boolean) ?? false };
      },
    }) as Promise<CursorPage<WalletTransaction>>;
  },

  async initFund(params: { amountKobo: number; callbackUrl?: string }): Promise<FundInitResponse> {
    return apiClient.post(
      'wallet/fund/initialize',
      { amount_kobo: params.amountKobo, callback_url: params.callbackUrl },
      { fromJson: (data) => fundInitResponseFromJson(data as Record<string, unknown>) },
    ) as Promise<FundInitResponse>;
  },

  async verifyFund(params: { reference: string }): Promise<FundVerifyResponse> {
    return apiClient.post(
      'wallet/fund/verify',
      { reference: params.reference },
      { fromJson: (data) => fundVerifyResponseFromJson(data as Record<string, unknown>) },
    ) as Promise<FundVerifyResponse>;
  },

  async withdraw(params: { amountKobo: number; idempotencyKey: string }): Promise<WithdrawalResponse> {
    return apiClient.post(
      'wallet/withdraw',
      { amount_kobo: params.amountKobo },
      { idempotencyKey: params.idempotencyKey, fromJson: (data) => withdrawalResponseFromJson(data as Record<string, unknown>) },
    ) as Promise<WithdrawalResponse>;
  },
};
