import type { ReactNode } from 'react';

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
  dismissResolvers.get(id)?.();
  dismissResolvers.delete(id);
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
  const merged: FeedbackModalEntry['options'] = { ...DEFAULT_FEEDBACK_OPTIONS, ...options };
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
  const merged: ConfirmationModalEntry['options'] = { ...DEFAULT_CONFIRMATION_OPTIONS, ...options };
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
  const merged: InputModalEntry['options'] = { ...DEFAULT_INPUT_OPTIONS, ...options };
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
