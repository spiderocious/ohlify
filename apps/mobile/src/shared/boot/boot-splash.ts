import * as SplashScreen from 'expo-splash-screen';
import { Platform } from 'react-native';

/**
 * Owns the native splash lifecycle so launch reads as ONE splash, not two.
 * The two platforms achieve that differently, because only one of them can
 * draw the real splash artwork (the full-screen background image + wordmark
 * that the JS Splash route renders) natively:
 *
 * - iOS: the native splash IS the artwork (assets/splash-full.png, composed
 *   from the same background + logo). It stays up while boot routing (session
 *   restore + onboarding status) runs, and hides only after the Splash route
 *   has navigated away — the user goes artwork → destination and the JS
 *   splash underneath is never seen.
 *
 * - Android 12+: the OS splash only permits an icon on a solid colour — it
 *   cannot show the background image. So the artwork lives in the JS Splash
 *   route instead: the moment it has painted, the native splash hides and the
 *   JS splash (identical centre logo, so the handoff reads as the background
 *   fading in around a stationary wordmark) is the visible boot splash while
 *   routing completes.
 *
 * Paths that never mount the Splash route — a gate (upgrade / app-lock /
 * first-run) replacing navigation — fall through at ROUTE_CAP_MS, the same
 * wait the old 2s timer imposed on everyone.
 */

SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden / not supported on this platform (e.g. some web contexts) — non-fatal.
});

/**
 * How long to hold the native splash for boot routing after the app tree is
 * ready. Matches the old JS splash timer so the gate paths (which never mount
 * the Splash route and therefore never call markBootRouted) wait no longer
 * than they did before.
 */
const ROUTE_CAP_MS = 2000;

let treeReady = false;
let routed = false;
let splashPainted = false;
let hidden = false;
let capTimer: ReturnType<typeof setTimeout> | null = null;

function maybeHide() {
  if (!treeReady) return;
  // Android swaps to the JS splash as soon as it has pixels (see module doc);
  // iOS keeps the native artwork up until routing has actually resolved.
  const ready = Platform.OS === 'android' ? splashPainted || routed : routed;
  if (ready) hideNativeSplash();
}

function hideNativeSplash() {
  if (hidden) return;
  hidden = true;
  if (capTimer !== null) {
    clearTimeout(capTimer);
    capTimer = null;
  }
  SplashScreen.hideAsync().catch(() => {
    // Already hidden, or unsupported on this platform — non-fatal.
  });
}

/**
 * Call once the app tree is mounted and able to paint (fonts loaded). Hides
 * immediately if the platform's hide condition is already met, otherwise arms
 * the cap so the splash can never hang past ROUTE_CAP_MS.
 */
export function markAppTreeReady(): void {
  if (treeReady) return;
  treeReady = true;
  maybeHide();
  if (!hidden && capTimer === null) {
    capTimer = setTimeout(hideNativeSplash, ROUTE_CAP_MS);
  }
}

/**
 * Call when the JS Splash route has laid out its first frame — the artwork
 * is on screen behind the native splash, so Android can hand off to it.
 */
export function markBootSplashPainted(): void {
  splashPainted = true;
  maybeHide();
}

/**
 * Call when the Splash route has decided where to go (or failed trying —
 * an error screen is still a destination). Hides the native splash if the
 * tree is ready; otherwise the markAppTreeReady call will.
 */
export function markBootRouted(): void {
  routed = true;
  maybeHide();
}
