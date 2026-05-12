import { useQuery } from '@tanstack/react-query';
import { apiClient, EP } from '@ohlify/api';
import type { BankAccount } from '@ohlify/api';

export function useBankAccount() {
  return useQuery({
    queryKey: ['me-bank-account'],
    queryFn: () =>
      apiClient
        .get(EP.ME_BANK_ACCOUNT)
        .json<{ data: BankAccount | null }>()
        .then((r) => r.data),
  });
}
