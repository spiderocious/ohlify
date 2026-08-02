import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useEffect, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { AuthSessionProvider } from '@features/auth/providers/auth-session-provider';
import { PERSISTED_CACHE_KEY } from '@shared/api/cache-keys';
import { queryKeys } from '@shared/api/query-keys';
import { AppConfigProvider } from '@shared/providers/app-config-provider';
import { RealtimeProvider } from '@shared/realtime/realtime-provider';

/** Cached data older than this is dropped on restore rather than shown as history. */
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Query defaults tuned for offline-first.
 *
 * `staleTime` is generous because SSE, not a timer, is what tells us data
 * moved — a short window would just refetch things nothing changed. `gcTime`
 * outlives the app session so a cold start has something to render.
 *
 * `retry: 2` with backoff, and **`networkMode: 'offlineFirst'`**: queries serve
 * cache without a connection instead of sitting in a permanent pending state,
 * which is the whole point of browsing on a plane.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 30_000),
      staleTime: 5 * 60_000,
      gcTime: CACHE_MAX_AGE_MS,
      networkMode: 'offlineFirst',
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    },
    mutations: {
      // Mutations are NOT offline-first: a purchase or a hangup queued against
      // a dead connection would fire later against state that has moved on.
      networkMode: 'online',
      retry: 0,
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: PERSISTED_CACHE_KEY,
  throttleTime: 2_000,
});

/**
 * Keys read by useInfiniteQuery. Their cache entries MUST look like
 * `{ pages, pageParams }` — InfiniteQueryObserver reads `data.pages.length`
 * while mounting, so a flat entry throws before any component can guard.
 *
 * A first-run prefetch used to warm the conversations key with a plain
 * prefetchQuery, storing the raw page instead (fixed in use-prefetch.ts).
 * Installs that already ran it still have the flat entry on disk, and it
 * rehydrates on every cold start — so it has to be rejected on the way in.
 */
const INFINITE_QUERY_KEYS: readonly (readonly string[])[] = [
  queryKeys.conversations(),
  queryKeys.callHistory(),
  queryKeys.walletTransactions(),
];

const startsWith = (key: readonly unknown[], prefix: readonly string[]): boolean =>
  prefix.every((segment, i) => key[i] === segment);

function isCorruptInfiniteEntry(key: readonly unknown[], data: unknown): boolean {
  if (!INFINITE_QUERY_KEYS.some((prefix) => startsWith(key, prefix))) return false;
  if (typeof data !== 'object' || data === null) return true;
  return !Array.isArray((data as { pages?: unknown }).pages);
}

/** Wraps the storage persister to sanitize what a cold start restores. */
const persister: typeof asyncStoragePersister = {
  ...asyncStoragePersister,
  restoreClient: async () => {
    const client = await asyncStoragePersister.restoreClient();
    if (!client) return client;
    const queries = client.clientState.queries.filter(
      (query) => !isCorruptInfiniteEntry(query.queryKey, query.state.data),
    );
    return { ...client, clientState: { ...client.clientState, queries } };
  },
};

/**
 * React Query's default online/focus detection is browser-shaped. Without
 * these, `refetchOnReconnect` never fires on a device and the app stays stale
 * after the network comes back.
 */
function useReactNativeManagers(): void {
  useEffect(() => {
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      onlineManager.setOnline(state.isConnected === true && state.isInternetReachable !== false);
    });
    const subscription = AppState.addEventListener('change', (status) => {
      focusManager.setFocused(status === 'active');
    });
    return () => {
      unsubscribeNet();
      subscription.remove();
    };
  }, []);
}

export function AppProvider({ children }: { children: ReactNode }) {
  useReactNativeManagers();

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: CACHE_MAX_AGE_MS,
        dehydrateOptions: {
          // Only successful queries are worth restoring. Persisting a failed
          // one would resurrect an error screen on a cold start that has no
          // reason to fail.
          shouldDehydrateQuery: (query) => query.state.status === 'success',
        },
      }}
    >
      <AppConfigProvider>
        <AuthSessionProvider>
          {/* Inside AuthSessionProvider: the stream only exists for a signed-in
              user, and needs the session to know when to open and close. */}
          <RealtimeProvider>{children}</RealtimeProvider>
        </AuthSessionProvider>
      </AppConfigProvider>
    </PersistQueryClientProvider>
  );
}
