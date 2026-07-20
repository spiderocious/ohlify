import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { UseQueryResult } from '@tanstack/react-query';
import { colors, EmptyState, ErrorState, type EmptyStateProps } from '@ohlify/mobile-ui';

import { apiErrorMessage, ApiError } from '@shared/types/api-error';

/**
 * Renders a React Query result consistently — loading/error/empty/success —
 * mirroring mobile/lib/ui/widgets/app_query_view/app_query_view.dart's
 * QueryState<T> switch. Every screen previously hand-rolled its own
 * isLoading/isError ternary chain (home-screen.tsx, professional-search-
 * screen.tsx, professional-details-screen.tsx, wallet-screen.tsx, all
 * slightly differently) — this is the shared replacement.
 *
 * `skeleton` renders in place of the bare spinner while loading, if given
 * (falls back to a plain ActivityIndicator if omitted — some screens don't
 * have a bespoke skeleton shape yet).
 *
 * Only shows the full ErrorState when there's truly no cached data to fall
 * back to — if `query.data` is present (even stale, from a background
 * refetch failure), renders the success content instead of discarding it.
 */
export interface QueryViewProps<T> {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
  skeleton?: ReactNode;
  emptyCheck?: (data: T) => boolean;
  emptyState?: Partial<EmptyStateProps>;
}

export function QueryView<T>({ query, children, skeleton, emptyCheck, emptyState }: QueryViewProps<T>) {
  const hasData = query.data !== undefined;

  if (query.isLoading && !hasData) {
    return (
      skeleton ?? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )
    );
  }

  if (query.isError && !hasData) {
    const apiError = query.error instanceof ApiError ? query.error : ApiError.network;
    return (
      <ErrorState
        message={apiErrorMessage(apiError)}
        isNetwork={apiError.isNetwork}
        onRetry={() => query.refetch()}
      />
    );
  }

  if (!hasData) return null;

  if (emptyCheck?.(query.data as T)) {
    return <EmptyState title="Nothing here yet" {...emptyState} />;
  }

  return <>{children(query.data as T)}</>;
}
