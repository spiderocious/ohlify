import { useQuery } from '@tanstack/react-query';
import { apiClient, EP } from '@ohlify/api';
import type { Faq } from '@ohlify/api';

export function useFaqs() {
  return useQuery({
    queryKey: ['faqs'],
    queryFn: () =>
      apiClient
        .get(EP.HELP_FAQS)
        .json<{ data: Faq[] }>()
        .then((r) => r.data),
    staleTime: 60 * 60 * 1000,
  });
}
