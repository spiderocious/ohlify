import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureApiClient, createMockQueryClient } from '@ohlify/api';
import { useMemo, type ReactNode } from 'react';

import '@ohlify/api/mocks/registry';
import { AppConfigProvider } from './shared/providers/app-config-provider.js';

const useMocks = import.meta.env['VITE_USE_MOCKS'] === '1';

// Configure the API client AT MODULE LOAD, before any component renders or any
// query hook fires. Without this, hooks that import { apiClient } from
// '@ohlify/api' would proxy through to an uninitialized singleton and throw.
if (!useMocks) {
  const baseUrl = import.meta.env['VITE_API_URL'];
  if (!baseUrl) {
    // Fail fast in dev/preview/prod alike — silently routing to the document
    // origin (the bug this whole refactor exists to kill) is far worse than a
    // visible error at boot.
    throw new Error(
      'VITE_API_URL is not set. Configure it in your environment before building.',
    );
  }
  configureApiClient(baseUrl);
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
      <AppConfigProvider>{children}</AppConfigProvider>
    </QueryClientProvider>
  );
}
