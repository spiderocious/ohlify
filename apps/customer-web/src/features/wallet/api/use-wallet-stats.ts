import { useQuery } from '@tanstack/react-query';
import { apiClient, EP } from '@ohlify/api';
import type { WalletStats } from '@ohlify/api';

export function useWalletStats() {
  return useQuery({
    queryKey: ['wallet-stats'],
    queryFn: () =>
      apiClient
        .get(EP.WALLET_STATS)
        .json<{ data: WalletStats }>()
        .then((r) => r.data),
    staleTime: 30_000,
  });
}
