import { useQuery } from '@tanstack/react-query';
import { apiClient, EP } from '@ohlify/api';

export function useResolveBankAccount(accountNumber: string, bankCode: string) {
  return useQuery({
    queryKey: ['bank-resolve', accountNumber, bankCode],
    queryFn: () =>
      apiClient
        .get(EP.BANKS_RESOLVE, {
          searchParams: { account_number: accountNumber, bank_code: bankCode },
        })
        .json<{ data: { account_name: string } }>()
        .then((r) => r.data),
    enabled: accountNumber.length >= 8 && bankCode !== '',
    staleTime: 60_000,
    retry: false,
  });
}
