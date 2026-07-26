import type { ReactNode } from 'react';

import { useAuthSession } from '@features/auth/providers/auth-session-provider';

import { usePrefetch } from '../providers/use-prefetch';
import { SetupScreen } from './setup-screen';

/**
 * Holds a brand-new signed-in user at a progress screen while the tabs warm.
 *
 * Returning users pass straight through — they already have persisted data, and
 * a progress bar would hide content they could be reading while the refresh
 * runs quietly under the status line.
 */
export function FirstRunGate({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthSession();
  const { isFirstRun, progress, label } = usePrefetch(isAuthenticated);

  if (isFirstRun) return <SetupScreen progress={progress} label={label} />;
  return <>{children}</>;
}
