import { registerRootComponent } from 'expo';

// Order matters here. Sentry and the boot guard are installed BEFORE any app
// import, because the failure they exist to catch happens while those imports
// are still being evaluated — `Env.requireEnv` throwing on a missing
// `EXPO_PUBLIC_*` var is exactly that, and it aborts the process before React
// mounts. Anything imported above them is unprotected.
import { initSentry } from './src/shared/boot/sentry';
import { installBootGuard, reportBootFailure } from './src/shared/boot/boot-guard';
import { BootFailureScreen } from './src/shared/boot/boot-failure-screen';

initSentry();
installBootGuard();

/**
 * The real app, or the fallback if its module graph fails to evaluate.
 *
 * `require` rather than a static import so the failure is catchable — a static
 * import is hoisted above this function and would throw before the try block
 * exists.
 */
function loadRoot(): Parameters<typeof registerRootComponent>[0] {
  try {
    // Background/killed-state push handlers must be registered before React
    // mounts — on a headless FCM wake the root component never renders at all.
    // No-op on web.
    // These stay require()s, and stay inside the try: a static import is hoisted
    // above the try block and would throw before the catch exists — which is the
    // exact crash this guard is here to prevent.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const push = require('./src/shared/push/push-service') as {
      installBackgroundPushHandlers: () => void;
    };
    push.installBackgroundPushHandlers();

    // eslint-disable-next-line @typescript-eslint/no-require-imports -- see above
    return (require('./src/app') as { App: Parameters<typeof registerRootComponent>[0] }).App;
  } catch (error) {
    reportBootFailure(error);
    return BootFailureScreen;
  }
}

registerRootComponent(loadRoot());
