import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';

import { appLockService } from '../services/app-lock-service';

/** A brief background (permission sheet, share sheet) should not force a re-unlock. */
const RELOCK_GRACE_MS = 30_000;

interface AppLockValue {
  /** True while the lock screen should be covering the app. */
  isLocked: boolean;
  isPinSet: boolean;
  biometricsEnabled: boolean;
  unlock: () => void;
  /** Lets a ringing call punch through the lock. */
  suspendLock: () => void;
  resumeLock: () => void;
  refreshSettings: () => Promise<void>;
}

const AppLockContext = createContext<AppLockValue | undefined>(undefined);

export function useAppLock(): AppLockValue {
  const ctx = useContext(AppLockContext);
  if (!ctx) throw new Error('useAppLock must be used inside AppLockProvider');
  return ctx;
}

/**
 * Locks the app behind a PIN or biometrics when it returns to the foreground.
 *
 * Entirely local: this hides the screen on a shared or stolen phone. It is not
 * authentication, and it never gates the session — so a forgotten PIN costs a
 * sign-out, not access to the account.
 *
 * `suspendLock` exists for one case: a ringing call. Demanding a PIN before
 * someone can answer costs answered calls, and the caller is already paying for
 * the seconds spent typing it. Everything BEHIND the call stays locked.
 */
export function AppLockProvider({ children }: { children: ReactNode }) {
  const [isPinSet, setIsPinSet] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const suspendedRef = useRef(false);
  const backgroundedAtRef = useRef<number | null>(null);

  const refreshSettings = useCallback(async () => {
    const [pinSet, bio] = await Promise.all([
      appLockService.isPinSet(),
      appLockService.isBiometricsEnabled(),
    ]);
    setIsPinSet(pinSet);
    setBiometricsEnabled(bio);
    // Turning the lock off while locked must not strand the user behind a
    // screen that no longer has anything to check.
    if (!pinSet) setIsLocked(false);
  }, []);

  useEffect(() => {
    void refreshSettings().then(() => {
      // Cold start with a lock configured begins locked — that is the case the
      // feature exists for.
      void appLockService.isPinSet().then((set) => setIsLocked(set));
    });
  }, [refreshSettings]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        const away = backgroundedAtRef.current;
        backgroundedAtRef.current = null;
        if (suspendedRef.current) return;
        if (!isPinSet) return;
        if (away !== null && Date.now() - away < RELOCK_GRACE_MS) return;
        setIsLocked(true);
        return;
      }
      if (backgroundedAtRef.current === null) backgroundedAtRef.current = Date.now();
    });
    return () => subscription.remove();
  }, [isPinSet]);

  const value = useMemo<AppLockValue>(
    () => ({
      isLocked,
      isPinSet,
      biometricsEnabled,
      unlock: () => setIsLocked(false),
      suspendLock: () => {
        suspendedRef.current = true;
        setIsLocked(false);
      },
      resumeLock: () => {
        suspendedRef.current = false;
      },
      refreshSettings,
    }),
    [isLocked, isPinSet, biometricsEnabled, refreshSettings],
  );

  return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>;
}
