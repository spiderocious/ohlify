import type { ReactNode } from 'react';

import { runAfterModalClose } from './run-after-modal-close';

/**
 * Central modal stack. 1:1 with mobile/lib/shared/notifiers/modal_notifier.dart
 * — same 4 modal types, same options shape, same stack (push/dismiss/dismissAll)
 * semantics. Plain module-level pub-sub, same pattern as toast-store.ts.
 *
 * Only FeedbackModalEntry has a rendering component so far
 * (packages/mobile-ui/src/modals/app-feedback-modal.tsx) — Confirmation/
 * Input/Custom modal components are added when a screen needs them
 * (docs/mobile-work/todo.md Part 5), matching how the API layer is scoped.
 */
export type ModalType = 'feedback' | 'confirmation' | 'input' | 'custom';
export type ModalFeedbackKind = 'success' | 'error' | 'warning' | 'info';
export type ModalConfirmationKind = 'neutral' | 'success' | 'error' | 'warning' | 'info';
export type ModalPosition = 'center' | 'top' | 'bottom' | 'fullscreen';

export interface FeedbackModalOptions {
  kind?: ModalFeedbackKind;
  position?: ModalPosition;
  dismissible?: boolean;
  showCloseButton?: boolean;
  /** Auto-dismiss after autoDismissDurationMs when true. */
  autoDismiss?: boolean;
  autoDismissDurationMs?: number;
  /** Custom icon — overrides the default circle icon. */
  icon?: ReactNode;
  onConfirm?: () => void;
  /** Optional secondary action button label below the primary button. */
  actionLabel?: string;
  onAction?: () => void;
  confirmButtonText?: string;
}

export interface FeedbackModalEntry {
  id: string;
  type: 'feedback';
  title: string;
  message: string;
  options: Required<Omit<FeedbackModalOptions, 'icon' | 'onConfirm' | 'actionLabel' | 'onAction'>> &
    Pick<FeedbackModalOptions, 'icon' | 'onConfirm' | 'actionLabel' | 'onAction'>;
}

export interface ConfirmationModalOptions {
  kind?: ModalConfirmationKind;
  confirmButtonText?: string;
  cancelButtonText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  position?: ModalPosition;
  dismissible?: boolean;
  showCloseButton?: boolean;
  showCancelButton?: boolean;
  showIcon?: boolean;
  icon?: ReactNode;
  /** When true, confirm button uses danger styling. */
  destructive?: boolean;
  isLoading?: boolean;
}

export interface ConfirmationModalEntry {
  id: string;
  type: 'confirmation';
  title: string;
  message: string;
  options: Required<Omit<ConfirmationModalOptions, 'icon' | 'onConfirm' | 'onCancel'>> &
    Pick<ConfirmationModalOptions, 'icon' | 'onConfirm' | 'onCancel'>;
}

export type InputModalInputType = 'text' | 'number' | 'email' | 'password';

export interface InputModalOptions {
  placeholder?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  onConfirm?: (value: string) => void;
  onCancel?: () => void;
  inputType?: InputModalInputType;
  /** Validates input — shows errorMessage when no match. */
  regex?: RegExp;
  errorMessage?: string;
  maxLength?: number;
  defaultValue?: string;
  /** When true uses a multiline textarea-style input. */
  multiline?: boolean;
  position?: ModalPosition;
  dismissible?: boolean;
  showCloseButton?: boolean;
  showCancelButton?: boolean;
  /** E.g. '1/4' shown above the title. */
  stepLabel?: string;
  /** Leading / trailing icon widgets forwarded to AppTextInput. Ignored when multiline is true. */
  startIcon?: ReactNode;
  endIcon?: ReactNode;
}

export interface InputModalEntry {
  id: string;
  type: 'input';
  title: string;
  message: string;
  options: Required<
    Omit<
      InputModalOptions,
      | 'onConfirm'
      | 'onCancel'
      | 'regex'
      | 'errorMessage'
      | 'defaultValue'
      | 'stepLabel'
      | 'startIcon'
      | 'endIcon'
    >
  > &
    Pick<
      InputModalOptions,
      | 'onConfirm'
      | 'onCancel'
      | 'regex'
      | 'errorMessage'
      | 'defaultValue'
      | 'stepLabel'
      | 'startIcon'
      | 'endIcon'
    >;
}

export interface CustomModalOptions {
  position?: ModalPosition;
  dismissible?: boolean;
  showCloseButton?: boolean;
}

export interface CustomModalEntry {
  id: string;
  type: 'custom';
  title: string;
  /** Builds the body content. Receives onDismiss so the builder can close the modal from within. */
  builder: (onDismiss: () => void) => ReactNode;
  options: Required<CustomModalOptions>;
}

export type ModalEntry =
  | FeedbackModalEntry
  | ConfirmationModalEntry
  | InputModalEntry
  | CustomModalEntry;

const DEFAULT_FEEDBACK_OPTIONS: FeedbackModalEntry['options'] = {
  kind: 'success',
  position: 'center',
  dismissible: true,
  showCloseButton: true,
  autoDismiss: false,
  autoDismissDurationMs: 4000,
  confirmButtonText: 'Done',
};

const DEFAULT_CONFIRMATION_OPTIONS: ConfirmationModalEntry['options'] = {
  kind: 'neutral',
  confirmButtonText: 'Confirm',
  cancelButtonText: 'Cancel',
  position: 'center',
  dismissible: true,
  showCloseButton: true,
  showCancelButton: true,
  showIcon: true,
  destructive: false,
  isLoading: false,
};

const DEFAULT_INPUT_OPTIONS: InputModalEntry['options'] = {
  placeholder: '',
  confirmButtonText: 'Save and proceed',
  cancelButtonText: 'Cancel',
  inputType: 'text',
  maxLength: 0,
  multiline: false,
  position: 'center',
  dismissible: true,
  showCloseButton: true,
  showCancelButton: true,
};

const DEFAULT_CUSTOM_OPTIONS: Required<CustomModalOptions> = {
  position: 'center',
  dismissible: true,
  showCloseButton: true,
};

export interface ModalHandle {
  id: string;
  dismiss: () => void;
  /** Resolves once the modal is removed from the stack — mirrors ModalCompleter.dismissed. */
  onDismissed: Promise<void>;
  /**
   * Toggles whether the user can close this modal (X button + tap-outside)
   * — e.g. a custom modal's content locking the modal shut while an
   * in-flight save should block the user from dismissing mid-request.
   * Custom-modal-entry-specific; no-op if this entry isn't type 'custom'.
   */
  setDismissible: (dismissible: boolean) => void;
}

let stack: ModalEntry[] = [];
let nextId = 0;
const listeners = new Set<() => void>();
const dismissResolvers = new Map<string, () => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): ModalEntry[] {
  return stack;
}

function dismiss(id: string): void {
  if (!stack.some((e) => e.id === id)) return;
  stack = stack.filter((e) => e.id !== id);
  emit();

  // Resolve only AFTER the host's exit animation and native unmount have
  // settled — not here, in the same tick the entry left the stack.
  //
  // Resolving synchronously is what made `await handle.onDismissed` a false
  // guarantee: it fired while ModalHost was still animating the modal out and
  // had not yet torn down the native <Modal>. Anything the caller did next
  // (navigate, open another modal, show a toast) mounted or unmounted a
  // surface mid-teardown, and Fabric aborts the process on that with
  // `AssertionError` in SurfaceMountingManager.overridePropsReadableMap —
  // a native crash with no JS frames (Sentry REACT-NATIVE-2).
  //
  // Doing it here rather than at each call site means every current and future
  // caller is covered by construction, instead of having to remember the rule.
  const resolve = dismissResolvers.get(id);
  dismissResolvers.delete(id);

  // Runs even when there is no resolver: `onDismissed` is only awaited by some
  // callers, but the queued callbacks belong to every modal and must still be
  // flushed or the confirm action would silently never happen.
  runAfterModalClose(() => {
    // Callbacks first, THEN the promise — see runPendingCallbacks.
    runPendingCallbacks(id);
    resolve?.();
  });
}

function dismissAll(): void {
  if (stack.length === 0) return;
  const ids = stack.map((e) => e.id);
  for (const id of ids) dismiss(id);
}

/**
 * Live-patches a modal entry's options after creation — e.g. a custom
 * modal's content toggling `dismissible`/`showCloseButton` off while an
 * in-flight save should block the user from closing out mid-request.
 * ModalHost re-reads `entry.options` on every render, so this takes effect
 * immediately without the caller needing a fresh handle.
 */
function updateOptions<T extends ModalEntry>(id: string, patch: Partial<T['options']>): void {
  const index = stack.findIndex((e) => e.id === id);
  if (index === -1) return;
  const entry = stack[index] as T;
  stack = stack.map((e, i) =>
    i === index ? { ...entry, options: { ...entry.options, ...patch } } : e,
  );
  emit();
}

/**
 * Callbacks captured from `onConfirm` / `onCancel` / `onAction`, queued per
 * modal id until that modal has closed and settled.
 */
const pendingCallbacks = new Map<string, (() => void)[]>();

function runPendingCallbacks(id: string): void {
  const queued = pendingCallbacks.get(id);
  pendingCallbacks.delete(id);
  if (!queued) return;
  for (const run of queued) run();
}

/**
 * Wraps a user-supplied modal callback so it runs after the modal has closed
 * and settled, rather than in the same tick as the dismiss.
 *
 * The modal components call `onDismiss()` and `options.onConfirm?.()` back to
 * back (see app-feedback-modal / app-confirmation-modal / app-input-modal), so
 * an unwrapped callback that navigates or opens another modal does so while
 * this one is still tearing down — the Fabric abort described in `dismiss`.
 *
 * ## Why a queue rather than each callback arming its own timer
 *
 * Several screens use the callback to set a local flag and then read that flag
 * after `await handle.onDismissed` (logout, cancel booking, delete account,
 * Paystack confirm). If both the callback and the promise merely started equal
 * delays, their relative order would be unspecified and the flag could be read
 * before it was written — turning a crash into a silent no-op, which is worse.
 *
 * Queuing instead lets `dismiss` run the callbacks and then resolve the
 * promise inside one settle window, so "callback before onDismissed" holds by
 * construction — the same order those screens already relied on.
 *
 * Applied once here, at entry creation, so it covers every call site including
 * ones written later. `undefined` passes through untouched so the modal
 * components' optional-call checks still behave the same.
 */
function deferCallback<A extends unknown[]>(
  id: string,
  callback: ((...args: A) => void) | undefined,
): ((...args: A) => void) | undefined {
  if (!callback) return undefined;
  return (...args: A) => {
    // A modal left open on purpose (a confirmation with `isLoading`, which
    // does not dismiss on confirm) would never flush its queue, so run
    // immediately in that case — nothing is tearing down, so nothing to wait
    // for.
    if (!stack.some((e) => e.id === id)) {
      runAfterModalClose(() => callback(...args));
      return;
    }
    const queued = pendingCallbacks.get(id) ?? [];
    queued.push(() => callback(...args));
    pendingCallbacks.set(id, queued);
  };
}

function makeHandle(id: string): ModalHandle {
  const onDismissed = new Promise<void>((resolve) => {
    dismissResolvers.set(id, resolve);
  });
  return {
    id,
    dismiss: () => dismiss(id),
    onDismissed,
    setDismissible: (dismissible) =>
      updateOptions<CustomModalEntry>(id, { dismissible, showCloseButton: dismissible }),
  };
}

function addFeedback(
  title: string,
  message: string,
  options: FeedbackModalOptions = {},
): ModalHandle {
  const id = `modal_${nextId++}`;
  const merged: FeedbackModalEntry['options'] = {
    ...DEFAULT_FEEDBACK_OPTIONS,
    ...options,
    onConfirm: deferCallback(id, options.onConfirm),
    onAction: deferCallback(id, options.onAction),
  };
  const entry: FeedbackModalEntry = { id, type: 'feedback', title, message, options: merged };
  stack = [...stack, entry];
  emit();

  if (merged.autoDismiss) {
    setTimeout(() => dismiss(id), merged.autoDismissDurationMs);
  }

  return makeHandle(id);
}

function addConfirmation(
  title: string,
  message: string,
  options: ConfirmationModalOptions = {},
): ModalHandle {
  const id = `modal_${nextId++}`;
  const merged: ConfirmationModalEntry['options'] = {
    ...DEFAULT_CONFIRMATION_OPTIONS,
    ...options,
    onConfirm: deferCallback(id, options.onConfirm),
    onCancel: deferCallback(id, options.onCancel),
  };
  const entry: ConfirmationModalEntry = {
    id,
    type: 'confirmation',
    title,
    message,
    options: merged,
  };
  stack = [...stack, entry];
  emit();
  return makeHandle(id);
}

function addInput(title: string, message: string, options: InputModalOptions = {}): ModalHandle {
  const id = `modal_${nextId++}`;
  const merged: InputModalEntry['options'] = {
    ...DEFAULT_INPUT_OPTIONS,
    ...options,
    onConfirm: deferCallback(id, options.onConfirm),
    onCancel: deferCallback(id, options.onCancel),
  };
  const entry: InputModalEntry = { id, type: 'input', title, message, options: merged };
  stack = [...stack, entry];
  emit();
  return makeHandle(id);
}

function addCustom(
  title: string,
  builder: (onDismiss: () => void) => ReactNode,
  options: CustomModalOptions = {},
): ModalHandle {
  const id = `modal_${nextId++}`;
  const merged: Required<CustomModalOptions> = { ...DEFAULT_CUSTOM_OPTIONS, ...options };
  const entry: CustomModalEntry = { id, type: 'custom', title, builder, options: merged };
  stack = [...stack, entry];
  emit();
  return makeHandle(id);
}

export const modalStore = {
  subscribe,
  getSnapshot,
  addFeedback,
  addConfirmation,
  addInput,
  addCustom,
  dismiss,
  dismissAll,
  updateOptions,
};
