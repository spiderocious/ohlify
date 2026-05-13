import { useMemo, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { configureAdminApiClient } from '@ohlify/api';

const apiBase = import.meta.env['VITE_API_URL'];
if (!apiBase) {
  throw new Error('VITE_API_URL is not set for admin-web.');
}
configureAdminApiClient(apiBase);

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
        },
      }),
    [],
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
