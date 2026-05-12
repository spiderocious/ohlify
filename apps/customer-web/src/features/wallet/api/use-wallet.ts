import { useQuery } from '@tanstack/react-query';
import { apiClient, EP } from '@ohlify/api';
import type { WalletBalance } from '@ohlify/api';

export function useWallet() {
  return useQuery({
    queryKey: ['wallet'],
    queryFn: () =>
      apiClient
        .get(EP.WALLET)
        .json<{ data: WalletBalance }>()
        .then((r) => r.data),
    staleTime: 30_000,
  });
}
