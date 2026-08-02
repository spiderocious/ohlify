import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';

/**
 * Crash + error reporting.
 *
 * Initialised from `index.ts` before any app module is imported, so a failure
 * during module evaluation — the class of crash an error boundary can never
 * catch — still gets reported.
 *
 * The DSN is not a secret: it identifies the project to Sentry's ingest
 * endpoint and ships inside the bundle either way. It reads from the
 * environment so staging and production can separate their events, and falls
 * back to the known project DSN so a misconfigured build still reports the
 * very misconfiguration that broke it — which is precisely when reporting
 * matters most.
 */
const FALLBACK_DSN =
  'https://8b949638e1f95b426cecf72467f5e4bb@o4511840457719808.ingest.de.sentry.io/4511840464076880';

export const initSentry = (): void => {
  const dsn = process.env['EXPO_PUBLIC_SENTRY_DSN'] || FALLBACK_DSN;
  if (!dsn) return;

  try {
    Sentry.init({
      dsn,
      environment: process.env['EXPO_PUBLIC_APP_ENV'] ?? 'development',
      release: Constants.expoConfig?.version ?? 'unknown',
      // Traces are off by default: this app's value here is crash visibility,
      // and performance sampling costs quota we would rather spend on errors.
      tracesSampleRate: 0,
      // Money and KYC flow through this app. Never let the SDK attach request
      // bodies, cookies, or user identifiers on its own.
      sendDefaultPii: false,
      beforeSend(event) {
        // Belt and braces — strip anything the SDK may have inferred.
        delete event.user;
        return event;
      },
    });
  } catch {
    // Reporting must never be the reason the app fails to start.
  }
};

export { Sentry };
