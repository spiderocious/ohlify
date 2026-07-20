/**
 * Central toast queue. 1:1 with mobile/lib/shared/notifiers/toast_notifier.dart
 * — same options shape, same auto-dismiss-after-duration behavior, same
 * dismiss/dismissAll semantics. Plain module-level pub-sub (subscribe/getSnapshot)
 * so it works with React's useSyncExternalStore without pulling in a state
 * library — mirrors the ChangeNotifier pattern without needing `provider`.
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition = 'top' | 'bottom';

export interface ToastOptions {
  type?: ToastType;
  position?: ToastPosition;
  /** ms before auto-dismiss. Ignored when sticky is true. */
  duration?: number;
  /** Whether a "Dismiss" button is shown. */
  dismissible?: boolean;
  showIcon?: boolean;
  /** When true the toast stays until manually dismissed. */
  sticky?: boolean;
  /** When true the toast spans the full screen width with no margins/radius. */
  fullWidth?: boolean;
}

export interface ToastEntry {
  id: string;
  message: string;
  options: Required<ToastOptions>;
}

const DEFAULT_OPTIONS: Required<ToastOptions> = {
  type: 'success',
  position: 'top',
  duration: 4000,
  dismissible: true,
  showIcon: true,
  sticky: false,
  fullWidth: false,
};

let toasts: ToastEntry[] = [];
let nextId = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): ToastEntry[] {
  return toasts;
}

function dismiss(id: string): void {
  if (!toasts.some((t) => t.id === id)) return;
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function dismissAll(): void {
  if (toasts.length === 0) return;
  toasts = [];
  emit();
}

function add(message: string, options: ToastOptions = {}): { id: string; dismiss: () => void } {
  const id = `toast_${nextId++}`;
  const merged: Required<ToastOptions> = { ...DEFAULT_OPTIONS, ...options };
  toasts = [...toasts, { id, message, options: merged }];
  emit();

  if (!merged.sticky) {
    setTimeout(() => dismiss(id), merged.duration);
  }

  return { id, dismiss: () => dismiss(id) };
}

export const toastStore = { subscribe, getSnapshot, add, dismiss, dismissAll };
