import type { QueryClient } from '@tanstack/react-query';

import { apiClient, EP } from '@ohlify/api';
import type {
  ApiRate,
  CallHistoryItem,
  CallHistoryPage,
  HomeResponse,
  ProfessionalDetail,
  ProfessionalsPage,
  ReviewsPage,
  WalletBalance,
} from '@ohlify/api';

import { withSlot } from './guards.js';

/**
 * Typed wrappers around `qc.prefetchQuery` for every data source we know how
 * to warm. Keep these in sync with the corresponding `use*` hook's query key
 * — TanStack matches by key, so a mismatch silently makes the prefetch a
 * cache miss with extra latency. The hooks live in:
 *   - features/home/api/use-home.ts                       → ['home']
 *   - features/calls/api/use-call-history.ts              → ['call-history']
 *   - features/call-details/api/use-call-history-item.ts  → ['call-history', id]
 *   - features/professional-details/api/use-professional.ts        → ['professional', id]
 *   - features/professional-details/api/use-professional-rates.ts  → ['professional-rates', id]
 *   - features/professional-details/api/use-professional-reviews.ts→ ['professional-reviews', id]
 *   - features/professional-search/api/use-professionals.ts        → ['professionals', params]
 *   - features/wallet/api/use-wallet.ts                            → ['wallet']
 *
 * `staleTime` here matches each hook's staleTime so the warmed entry stays
 * usable through the user's navigation latency.
 */

// ── data prefetches ────────────────────────────────────────────────────────

export const prefetchHome = (qc: QueryClient) =>
  withSlot(() =>
    qc.prefetchQuery({
      queryKey: ['home'],
      queryFn: () =>
        apiClient
          .get(EP.HOME)
          .json<{ data: HomeResponse }>()
          .then((r) => r.data),
      staleTime: 60_000,
    }),
  );

export const prefetchCallHistory = (qc: QueryClient) =>
  withSlot(() =>
    qc.prefetchQuery({
      queryKey: ['call-history'],
      queryFn: () => apiClient.get(EP.CALL_HISTORY).json<CallHistoryPage>(),
      staleTime: 30_000,
    }),
  );

export const prefetchCallHistoryItem = (qc: QueryClient, id: string) =>
  withSlot(() =>
    qc.prefetchQuery({
      queryKey: ['call-history', id],
      queryFn: () =>
        apiClient
          .get(EP.CALL_HISTORY_ITEM(id))
          .json<{ data: CallHistoryItem }>()
          .then((r) => r.data),
      staleTime: 30_000,
    }),
  );

export const prefetchProfessionals = (qc: QueryClient) => {
  // Mirror the search screen's default params so the cache key matches the
  // first render of /professionals exactly. If those defaults shift, this
  // becomes a cache miss — keep them aligned with the search hook.
  const params = { sort: 'rating' as const, direction: 'desc' as const };
  return withSlot(() =>
    qc.prefetchQuery({
      queryKey: ['professionals', params],
      queryFn: () =>
        apiClient
          .get(EP.PROFESSIONALS, {
            searchParams: { sort: params.sort, direction: params.direction },
          })
          .json<ProfessionalsPage>(),
      staleTime: 30_000,
    }),
  );
};

export const prefetchProfessional = (qc: QueryClient, id: string) =>
  withSlot(() =>
    qc.prefetchQuery({
      queryKey: ['professional', id],
      queryFn: () =>
        apiClient
          .get(EP.PROFESSIONAL(id))
          .json<{ data: ProfessionalDetail }>()
          .then((r) => r.data),
      staleTime: 60_000,
    }),
  );

export const prefetchProfessionalRates = (qc: QueryClient, id: string) =>
  withSlot(() =>
    qc.prefetchQuery({
      queryKey: ['professional-rates', id],
      queryFn: () =>
        apiClient
          .get(EP.PROFESSIONAL_RATES(id))
          .json<{ data: ApiRate[] }>()
          .then((r) => r.data),
      staleTime: 60_000,
    }),
  );

export const prefetchProfessionalReviews = (qc: QueryClient, id: string) =>
  withSlot(() =>
    qc.prefetchQuery({
      queryKey: ['professional-reviews', id],
      queryFn: () => apiClient.get(EP.PROFESSIONAL_REVIEWS(id)).json<ReviewsPage>(),
      staleTime: 60_000,
    }),
  );

export const prefetchWallet = (qc: QueryClient) =>
  withSlot(() =>
    qc.prefetchQuery({
      queryKey: ['wallet'],
      queryFn: () =>
        apiClient
          .get(EP.WALLET)
          .json<{ data: WalletBalance }>()
          .then((r) => r.data),
      staleTime: 30_000,
    }),
  );

// ── JS chunk prefetches ────────────────────────────────────────────────────
//
// Each `chunk*` is a thunk that triggers a dynamic `import()` for the screen
// module. Vite hashes these into separate bundles; calling the thunk pulls
// the chunk into the browser cache so the user's eventual navigation
// resolves Suspense synchronously. `import()` is idempotent — calling these
// multiple times costs one network request.

export const chunkHome = () => import('../../features/home/screen/home-screen.js');
export const chunkCalls = () => import('../../features/calls/screen/calls-screen.js');
export const chunkCallDetails = () =>
  import('../../features/call-details/screen/call-details-screen.js');
export const chunkWallet = () => import('../../features/wallet/screen/wallet-screen.js');
export const chunkProfessionalSearch = () =>
  import('../../features/professional-search/screen/professional-search-screen.js');
export const chunkProfessionalDetails = () =>
  import('../../features/professional-details/screen/professional-details-screen.js');
export const chunkScheduleCall = () =>
  import('../../features/schedule-call/screen/schedule-call-screen.js');
