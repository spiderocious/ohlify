import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { AuthSessionProvider } from '@features/auth/providers/auth-session-provider';
import { AppConfigProvider } from '@shared/providers/app-config-provider';

/**
 * Matches mobile/lib/shared/query/ intent (see docs/mobile-work/todo.md's
 * Flutter-query-to-TanStack-Query mapping) — real TanStack Query instead of
 * a hand-rolled cache. staleTime/retry defaults match apps/customer-web's
 * app.provider.tsx (30s staleTime, retry: 1) as a starting point; revisit
 * per-query in each feature's api/ hooks as they're built.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppConfigProvider>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </AppConfigProvider>
    </QueryClientProvider>
  );
}
