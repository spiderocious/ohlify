import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureApiClient, createMockQueryClient } from '@ohlify/api';
import { useMemo, type ReactNode } from 'react';

import '@ohlify/api/mocks/registry';
import { AppConfigProvider } from './shared/providers/app-config-provider.js';

const useMocks = import.meta.env['VITE_USE_MOCKS'] === '1';
window.BASE_URL = import.meta.env['VITE_API_URL'];
console.log(import.meta.env, "meta env", window?.BASE_URL);

if (!useMocks) {
  configureApiClient(import.meta.env['VITE_API_URL']);
}

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const queryClient = useMemo(
    () =>
      useMocks
        ? createMockQueryClient()
        : new QueryClient({
            defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
          }),
    [],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AppConfigProvider>
        {children}
      </AppConfigProvider>
    </QueryClientProvider>
  );
}
