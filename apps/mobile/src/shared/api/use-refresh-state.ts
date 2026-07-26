import { formatRelative } from '@ohlify/core';
import { onlineManager, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

export interface RefreshState {
  /** One line for under a screen title. Empty when everything is current. */
  label: string;
  isOffline: boolean;
  isRefreshing: boolean;
  /** When the data on screen was last successfully fetched. */
  lastUpdatedAt?: Date;
}

/** Re-renders on a timer so "3 minutes ago" doesn't freeze at "just now". */
function useTicker(everyMs: number): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), everyMs);
    return () => clearInterval(timer);
  }, [everyMs]);
}

function useIsOffline(): boolean {
  const [offline, setOffline] = useState(!onlineManager.isOnline());
  useEffect(() => onlineManager.subscribe(() => setOffline(!onlineManager.isOnline())), []);
  return offline;
}

/**
 * The status line under a screen title.
 *
 * Cached data is shown immediately and silently while it is fresh — the line
 * only appears when the user needs to know something: that a refresh is in
 * flight, or that what they are reading is old because the network is gone.
 * Saying "last refreshed 4 hours ago" is what makes an offline screen honest
 * instead of quietly wrong.
 */
export function useRefreshState(queryKey: readonly unknown[]): RefreshState {
  useTicker(30_000);
  const isOffline = useIsOffline();
  const queryClient = useQueryClient();

  const state = queryClient.getQueryState(queryKey);
  const lastUpdatedAt = state?.dataUpdatedAt ? new Date(state.dataUpdatedAt) : undefined;
  const isRefreshing = (state?.fetchStatus ?? 'idle') === 'fetching';

  const label = ((): string => {
    if (isRefreshing) return 'Refreshing…';
    if (!isOffline) return '';
    if (!lastUpdatedAt) return 'You’re offline';
    return `You’re offline · last refreshed ${formatRelative(lastUpdatedAt)}`;
  })();

  return { label, isOffline, isRefreshing, ...(lastUpdatedAt ? { lastUpdatedAt } : {}) };
}

/**
 * "Last refreshed X ago" for a balance.
 *
 * Balances get this unconditionally, online or not: a number that moves with
 * real money should never look live when it is minutes old.
 */
export function useLastRefreshed(queryKey: readonly unknown[]): string {
  useTicker(30_000);
  const queryClient = useQueryClient();
  const updatedAt = queryClient.getQueryState(queryKey)?.dataUpdatedAt;
  if (!updatedAt) return '';
  return `Last refreshed ${formatRelative(new Date(updatedAt))}`;
}

/**
 * Pull-to-refresh that reports whether the attempt actually succeeded, so a
 * failed pull can stop the spinner instead of leaving it turning forever.
 */
export function usePullToRefresh(queryKey: readonly unknown[]) {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await queryClient.refetchQueries({ queryKey: [...queryKey] });
    } catch {
      // Swallowed on purpose: the status line already tells the user they are
      // offline, and a toast on every failed pull would be noise.
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient, queryKey]);

  return { isRefreshing, onRefresh };
}

/** Lets a screen gate an action that must not run on cached data. */
export function useIsOnline(): boolean {
  return !useIsOffline();
}
