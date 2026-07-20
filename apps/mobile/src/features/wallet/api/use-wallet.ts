import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { idempotencyKey } from '@shared/utils/idempotency';

import { walletApi } from './wallet-api';

/** Mirrors mobile/lib/features/wallet/providers/wallet_notifiers.dart's CacheKeys. */
export const walletQueryKey = () => ['wallet'] as const;
export const walletStatsQueryKey = () => ['wallet-stats'] as const;
export const walletTransactionsQueryKey = () => ['wallet-transactions'] as const;

export function useWallet() {
  return useQuery({ queryKey: walletQueryKey(), queryFn: () => walletApi.getWallet(), staleTime: 30_000 });
}

export function useWalletStats() {
  return useQuery({ queryKey: walletStatsQueryKey(), queryFn: () => walletApi.getStats(), staleTime: 30_000 });
}

export function useWalletTransactions() {
  return useInfiniteQuery({
    queryKey: walletTransactionsQueryKey(),
    queryFn: ({ pageParam }) => walletApi.getTransactions({ cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
    staleTime: 30_000,
  });
}

/** Mirrors mobile/lib/features/wallet/providers/withdraw_mutation.dart — fresh idempotency key per attempt. */
export function useWithdrawMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (amountKobo: number) => walletApi.withdraw({ amountKobo, idempotencyKey: idempotencyKey() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: walletQueryKey() });
      queryClient.invalidateQueries({ queryKey: walletStatsQueryKey() });
      queryClient.invalidateQueries({ queryKey: walletTransactionsQueryKey() });
    },
  });
}
