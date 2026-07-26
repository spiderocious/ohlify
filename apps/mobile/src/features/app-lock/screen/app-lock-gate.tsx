import type { ReactNode } from 'react';

import { useAppLock } from '../providers/app-lock-provider';
import { LockScreen } from './lock-screen';

/**
 * Renders the lock over everything while the app is locked.
 *
 * Children stay MOUNTED underneath rather than being swapped out: unmounting
 * the navigator would drop in-flight state — a half-typed message, a live call
 * — and unlocking should return the user exactly where they were.
 */
export function AppLockGate({ children }: { children: ReactNode }) {
  const { isLocked } = useAppLock();
  return (
    <>
      {children}
      {isLocked ? <LockScreen /> : null}
    </>
  );
}
