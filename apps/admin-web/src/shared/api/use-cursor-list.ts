import { useCallback, useState } from 'react';

import { useAdminQuery } from './use-admin-query.js';
import type { ApiError, CursorMeta } from '@ohlify/api';

/**
 * Cursor pagination state machine for list endpoints. Maintains a stack
 * of seen cursors so Prev can pop. Caller passes the URL + filters and
 * gets back items + meta + nav helpers.
 *
 * Filter changes (anything in `key` other than the stack tip) reset the
 * stack — otherwise switching a filter would leave you on a stale cursor.
 */
type Primitive = string | number | boolean | undefined | null;
type FiltersShape = Readonly<Record<string, Primitive>>;

interface UseCursorListConfig<T, F extends FiltersShape> {
  key: readonly unknown[];
  url: string;
  /** Filters added as querystring params alongside `cursor` + `limit`. */
  filters: F;
  limit?: number;
  enabled?: boolean;
  staleTime?: number;
  /** Map the raw envelope item to T (defaults to identity). */
  mapItem?: (raw: unknown) => T;
}

export interface UseCursorListResult<T> {
  items: T[];
  isLoading: boolean;
  isFetching: boolean;
  error: ApiError | null;
  hasNext: boolean;
  hasPrev: boolean;
  goNext: () => void;
  goPrev: () => void;
  reset: () => void;
  refetch: () => void;
}

export function useCursorList<T = unknown, F extends FiltersShape = FiltersShape>({
  key,
  url,
  filters,
  limit = 20,
  enabled,
  staleTime,
  mapItem,
}: UseCursorListConfig<T, F>): UseCursorListResult<T> {
  // Stack of cursors we've navigated INTO. The current page's cursor is
  // the tip (or `undefined` for the first page).
  const [stack, setStack] = useState<Array<string | undefined>>([undefined]);
  const cursor = stack[stack.length - 1];

  const filterFingerprint = JSON.stringify(filters);

  // Cast to a plain index-sig record so TS doesn't complain when the caller
  // passes a named interface (which lacks an explicit string index sig).
  const params: Record<string, Primitive> = {
    ...(filters as Record<string, Primitive>),
    cursor,
    limit,
  };

  const query = useAdminQuery<{ items: T[]; meta: CursorMeta }>({
    key: [...key, filterFingerprint, cursor],
    url,
    searchParams: params,
    enabled,
    staleTime,
    select: (data, meta) => {
      const arr = Array.isArray(data) ? data : [];
      const items = mapItem ? arr.map(mapItem) : (arr as T[]);
      const m = (meta as CursorMeta | undefined) ?? { next_cursor: null };
      return { items, meta: m };
    },
  });

  const goNext = useCallback(() => {
    const next = query.data?.meta.next_cursor;
    if (!next) return;
    setStack((s) => [...s, next]);
  }, [query.data?.meta.next_cursor]);

  const goPrev = useCallback(() => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }, []);

  const reset = useCallback(() => setStack([undefined]), []);

  return {
    items: query.data?.items ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error ?? null,
    hasNext: Boolean(query.data?.meta.next_cursor),
    hasPrev: stack.length > 1,
    goNext,
    goPrev,
    reset,
    refetch: query.refetch,
  };
}
