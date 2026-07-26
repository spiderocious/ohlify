import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

import { apiClient } from '@shared/api/api-client';
import { isFirstRunComplete, markFirstRunComplete } from '@shared/api/cache-keys';
import { queryKeys } from '@shared/api/query-keys';

import { fetchHome } from '@features/home/api/use-home';
import { chatApi } from '@features/chat/api/chat-api';
import { walletApi } from '@features/wallet/api/wallet-api';

/**
 * What a first run warms before showing the app.
 *
 * Only the four surfaces behind the bottom bar — enough that every tab has
 * something to render immediately. Prefetching more would trade a longer wait
 * for data the user may never open.
 */
const STEPS = [
  { label: 'Loading your dashboard', key: queryKeys.home(), fetch: fetchHome },
  { label: 'Checking your wallet', key: queryKeys.wallet(), fetch: () => walletApi.getWallet() },
  {
    label: 'Fetching your chats',
    key: queryKeys.conversations(),
    fetch: () => chatApi.listConversations({ limit: 20 }),
  },
  {
    label: 'Almost there',
    key: queryKeys.badges(),
    fetch: () =>
      apiClient.get('me/badges', { fromJson: (data) => data }) as Promise<unknown>,
  },
] as const;

export interface PrefetchState {
  /** True while the setup screen should be showing. */
  isFirstRun: boolean;
  progress: number;
  label: string;
}

/**
 * Warms the cache on a genuine first run only.
 *
 * A returning user never sees this: they already have persisted data, so
 * showing a progress screen would hide content they could be reading while the
 * refresh happens quietly behind the status line.
 *
 * Individual failures do not block entry. Arriving at a partly-empty app that
 * fills in beats being held at a spinner because one endpoint is slow.
 */
export function usePrefetch(isAuthenticated: boolean): PrefetchState {
  const queryClient = useQueryClient();
  const [isFirstRun, setIsFirstRun] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [checked, setChecked] = useState(false);

  const run = useCallback(async () => {
    for (const step of STEPS) {
      try {
        await queryClient.prefetchQuery({ queryKey: [...step.key], queryFn: step.fetch });
      } catch {
        // Best-effort: the screen will fetch it again on mount.
      }
      setCompleted((n) => n + 1);
    }
    await markFirstRunComplete();
    setIsFirstRun(false);
  }, [queryClient]);

  useEffect(() => {
    if (!isAuthenticated || checked) return;
    setChecked(true);
    void isFirstRunComplete().then((done) => {
      if (done) return;
      setIsFirstRun(true);
      void run();
    });
  }, [isAuthenticated, checked, run]);

  const index = Math.min(completed, STEPS.length - 1);
  return {
    isFirstRun,
    progress: completed / STEPS.length,
    label: STEPS[index]?.label ?? '',
  };
}
