import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '@shared/types/api-error';

import type { ProfessionalListItem } from '@features/home/types/home-models';

import { professionalsApi } from '../api/professionals-api';
import type { ProSortDirection, ProSortKey } from '../types/professional-models';

const DEBOUNCE_MS = 300;

/**
 * Cursor-paginated, debounced search for the professional list. Mirrors
 * mobile/lib/features/professionals/providers/professionals_search_notifier.dart
 * (a hand-rolled ChangeNotifier, not TanStack Query, since it needs
 * debounce + sequence-number race protection that useQuery doesn't model
 * directly).
 */
export function useProfessionalsSearch(initialCategory?: string) {
  const [query, setQueryState] = useState('');
  const [category, setCategoryState] = useState(initialCategory);
  const [sort, setSortState] = useState<ProSortKey>('rating');
  const [direction, setDirectionState] = useState<ProSortDirection>('desc');

  const [items, setItems] = useState<ProfessionalListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [error, setError] = useState<ApiError | undefined>(undefined);

  const seqRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Mirrors reading the latest filter state inside the debounced/async callbacks below.
  const stateRef = useRef({ query, category, sort, direction });
  stateRef.current = { query, category, sort, direction };

  const refresh = useCallback(async () => {
    const seq = ++seqRef.current;
    setIsFetching(true);
    setError(undefined);
    try {
      const { query: q, category: c, sort: s, direction: d } = stateRef.current;
      const page = await professionalsApi.search({ query: q || undefined, category: c, sort: s, direction: d, cursor: undefined });
      if (seq !== seqRef.current) return;
      setItems(page.items);
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
      setInitialLoaded(true);
    } catch (e) {
      if (seq !== seqRef.current) return;
      setError(e instanceof ApiError ? e : ApiError.network);
    } finally {
      if (seq === seqRef.current) setIsFetching(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (isFetching || !hasMore || !nextCursor) return;
    setIsFetching(true);
    try {
      const { query: q, category: c, sort: s, direction: d } = stateRef.current;
      const page = await professionalsApi.search({ query: q || undefined, category: c, sort: s, direction: d, cursor: nextCursor });
      setItems((prev) => [...prev, ...page.items]);
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.network);
    } finally {
      setIsFetching(false);
    }
  }, [isFetching, hasMore, nextCursor]);

  const setQuery = useCallback((value: string) => {
    setQueryState(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(refresh, DEBOUNCE_MS);
  }, [refresh]);

  const setCategory = useCallback(
    (value: string | undefined) => {
      setCategoryState(value);
    },
    [],
  );

  const setSort = useCallback((key: ProSortKey, dir: ProSortDirection) => {
    setSortState(key);
    setDirectionState(dir);
  }, []);

  // Re-run search whenever category/sort/direction change (mirrors the Dart
  // setters calling refresh() synchronously — query changes debounce above).
  // `refresh` has a stable identity (empty useCallback deps), so including
  // it here doesn't cause extra effect runs.
  useEffect(() => {
    refresh();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [category, sort, direction, refresh]);

  return {
    query,
    category,
    sort,
    direction,
    items,
    hasMore,
    isFetching,
    isLoadingInitial: isFetching && !initialLoaded,
    error,
    setQuery,
    setCategory,
    setSort,
    refresh,
    loadMore,
  };
}
