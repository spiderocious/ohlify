import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';

/**
 * Catches failures that happen before React exists.
 *
 * `AppErrorBoundary` can only catch what its children throw. A module-level
 * throw — a missing `EXPO_PUBLIC_*` var, a native module that fails to link —
 * happens while `index.ts` is still evaluating its imports, so nothing is
 * mounted to catch it. React Native then aborts the process and Android shows
 * its generic "this app has a bug" dialog: no message, no report, nothing the
 * user can act on.
 *
 * This module is imported first, before any app code, so its handler is
 * installed by the time those imports run.
 */

/** Set when boot fails, so `App` can render the fallback instead of the real tree. */
let bootFailure: Error | null = null;

export const getBootFailure = (): Error | null => bootFailure;

export const appVersion = (): string => Constants.expoConfig?.version ?? 'unknown';

/**
 * Records a boot failure and reports it.
 *
 * Reporting is best-effort and deliberately swallows its own errors: if Sentry
 * itself is what failed to initialise, we still want the fallback screen rather
 * than a second crash on top of the first.
 */
export const reportBootFailure = (error: unknown): void => {
  const err = error instanceof Error ? error : new Error(String(error));
  bootFailure = err;
  try {
    Sentry.captureException(err, {
      tags: { boot_failure: 'true', app_version: appVersion() },
      level: 'fatal',
    });
  } catch {
    // Sentry unavailable — the fallback screen is still shown.
  }
};

/**
 * Installs the global JS handler.
 *
 * `ErrorUtils` is React Native's own last-resort hook, invoked for anything the
 * JS runtime could not otherwise handle. Chaining to the previous handler keeps
 * RN's red-box in development; in release the default is what kills the process,
 * so for a fatal boot error we deliberately do NOT chain — that is the whole
 * point of surviving to show a screen.
 */
export const installBootGuard = (): void => {
  const globalWithErrorUtils = globalThis as typeof globalThis & {
    ErrorUtils?: {
      getGlobalHandler: () => (error: unknown, isFatal?: boolean) => void;
      setGlobalHandler: (handler: (error: unknown, isFatal?: boolean) => void) => void;
    };
  };
  const errorUtils = globalWithErrorUtils.ErrorUtils;
  if (!errorUtils) return;

  const previous = errorUtils.getGlobalHandler();

  errorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
    if (isFatal) {
      reportBootFailure(error);
      // Swallow deliberately: letting the default handler run aborts the
      // process, which is exactly the behaviour we are replacing.
      return;
    }
    previous(error, isFatal);
  });
};
