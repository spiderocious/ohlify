import { useQuery } from '@tanstack/react-query';
import { apiClient, EP } from '@ohlify/api';
import type { HelpContact } from '@ohlify/api';

export function useHelpContact() {
  return useQuery({
    queryKey: ['help-contact'],
    queryFn: () =>
      apiClient
        .get(EP.HELP_CONTACT)
        .json<{ data: HelpContact }>()
        .then((r) => r.data),
    staleTime: 60 * 60 * 1000,
  });
}
