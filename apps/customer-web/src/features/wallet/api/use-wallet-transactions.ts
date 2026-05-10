import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient, EP } from '@ohlify/api';
import type { TransactionsPage } from '@ohlify/api';

export function useWalletTransactions() {
  return useInfiniteQuery({
    queryKey: ['wallet-transactions'],
    queryFn: ({ pageParam }) => {
      const searchParams: Record<string, string> = {};
      if (pageParam) searchParams['cursor'] = pageParam as string;
      return apiClient
        .get(EP.WALLET_TRANSACTIONS, { searchParams })
        .json<TransactionsPage>();
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta.next_cursor ?? undefined,
    staleTime: 30_000,
  });
}
