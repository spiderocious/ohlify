import { InteractionManager } from 'react-native';

import { duration } from '../theme/motion';

/**
 * Runs `action` once the currently-closing modal has finished unmounting.
 *
 * ## You probably do not need to call this directly
 *
 * `modal-store` already routes `onConfirm` / `onCancel` / `onAction` and the
 * `onDismissed` promise through here, so a callback passed to
 * `showConfirmationModal` / `showFeedbackModal` / `showInputModal` — and any
 * code after `await handle.onDismissed` — is already safe.
 *
 * Reach for this only when closing a modal WITHOUT going through those: most
 * often a `showCustomModal` builder that calls its `dismiss()` argument and
 * then wants to navigate or open something else in the same breath.
 *
 * ## Why this exists
 *
 * Doing anything that touches the view tree in the same tick as dismissing a
 * modal — showing a toast, navigating, opening another modal — mounts or
 * unmounts a native surface while the modal's exit animation is still running.
 * Fabric can then deliver a queued prop update to a view that no longer exists,
 * which is not recoverable: it aborts the process with
 *
 *     java.lang.AssertionError: Assertion failed
 *       at SurfaceMountingManager.overridePropsReadableMap(SurfaceMountingManager.kt:1331)
 *
 * The stack is entirely native, with no JS frames, so it cannot be caught by an
 * error boundary or traced back to the call site that caused it. (Sentry
 * REACT-NATIVE-2.)
 *
 * ## Why both delays
 *
 * `duration.base` covers ModalHost's exit animation; the extra frame lets the
 * native driver settle before anything else mounts. `runAfterInteractions` then
 * waits for any in-flight touch/animation handling. Neither alone is reliable —
 * the timeout without the interaction wait still lands mid-gesture, and the
 * interaction wait alone can resolve while the exit animation is still playing.
 */
const EXIT_SETTLE_MS = duration.base + 32;

export function runAfterModalClose(action: () => void): void {
  setTimeout(() => {
    InteractionManager.runAfterInteractions(action);
  }, EXIT_SETTLE_MS);
}
