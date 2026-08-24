import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { HawkIcon } from '../foundation/icon.js';
import {
  IconAlertTriangle,
  IconCheck,
  IconClose,
  IconInfo,
} from '../icons/index.js';
import type { HawkIconComponent } from '../icons/index.js';
import { HawkSemantic, quartet } from '../theme/semantic.js';
import { cn } from '../utils/cn.js';

/**
 * Toasts.
 *
 * **A toast does not get its own palette.** CONTRACTS §1.2 — it is a *surface
 * treatment* of the shared semantic enum: `soft` background, `onSoft` text,
 * `base` icon. The pre-Hawk app had four toast background colours that
 * disagreed with its own semantic colours (`success #16A34A` against
 * `toastSuccessBg #3FB12C`), which is the exact failure the quartet prevents.
 *
 * Hawk ships its own host rather than reusing the app's. That is an isolation
 * requirement, not a preference: the admin app mounts `@ohlify/ui`'s `ToastHost`
 * at its root, and reusing it would make Hawk depend on the package it is
 * meant to replace.
 */
const SEMANTIC_ICON: Record<HawkSemantic, HawkIconComponent> = {
  neutral: IconInfo,
  info: IconInfo,
  success: IconCheck,
  caution: IconAlertTriangle,
  critical: IconAlertTriangle,
};

export interface HawkToastOptions {
  semantic?: HawkSemantic;
  /** Milliseconds before auto-dismiss. `0` keeps it until dismissed. */
  duration?: number;
  title?: string;
  action?: { label: string; onClick: () => void };
  icon?: HawkIconComponent;
}

export interface HawkToastEntry extends HawkToastOptions {
  id: string;
  message: string;
}

type Listener = (toasts: readonly HawkToastEntry[]) => void;

/**
 * A tiny store, deliberately not a React context.
 *
 * `hawkToast.show(...)` has to be callable from an event handler, a promise
 * chain, an error boundary — places where no hook is available. A module-level
 * store is what makes that work, and it is the same shape the older package's
 * `DrawerService` established.
 */
class ToastStore {
  private toasts: HawkToastEntry[] = [];
  private listeners = new Set<Listener>();
  private counter = 0;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    const snapshot = [...this.toasts];
    this.listeners.forEach((listener) => listener(snapshot));
  }

  show(message: string, options: HawkToastOptions = {}): string {
    this.counter += 1;
    const id = `hawk-toast-${this.counter}`;
    this.toasts = [...this.toasts, { id, message, ...options }];
    this.emit();
    return id;
  }

  success(message: string, options?: Omit<HawkToastOptions, 'semantic'>): string {
    return this.show(message, { ...options, semantic: HawkSemantic.SUCCESS });
  }

  error(message: string, options?: Omit<HawkToastOptions, 'semantic'>): string {
    // Errors default to sticky. A failure the user missed because it timed out
    // is a failure they will hit again.
    return this.show(message, {
      duration: 0,
      ...options,
      semantic: HawkSemantic.CRITICAL,
    });
  }

  info(message: string, options?: Omit<HawkToastOptions, 'semantic'>): string {
    return this.show(message, { ...options, semantic: HawkSemantic.INFO });
  }

  dismiss(id: string): void {
    this.toasts = this.toasts.filter((toast) => toast.id !== id);
    this.emit();
  }

  clear(): void {
    this.toasts = [];
    this.emit();
  }

  snapshot(): readonly HawkToastEntry[] {
    return this.toasts;
  }
}

export const hawkToast = new ToastStore();

/** Subscribe to the toast queue. */
export function useHawkToasts(): readonly HawkToastEntry[] {
  const [toasts, setToasts] = useState<readonly HawkToastEntry[]>(() => hawkToast.snapshot());
  useEffect(() => hawkToast.subscribe(setToasts), []);
  return toasts;
}

export interface HawkToastProps {
  toast: HawkToastEntry;
  onDismiss: () => void;
}

export function HawkToast({ toast, onDismiss }: HawkToastProps) {
  const semantic = toast.semantic ?? HawkSemantic.NEUTRAL;
  const tone = quartet(semantic);
  const duration = toast.duration ?? 4000;

  useEffect(() => {
    if (duration <= 0) return undefined;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <div
      role={semantic === 'critical' ? 'alert' : 'status'}
      className={cn(
        'hawk-motion pointer-events-auto flex w-full max-w-md items-start gap-hawk-4',
        'animate-hawk-toast-in rounded-hawk-fixed-md border p-hawk-5 shadow-hawk-toast',
        tone.softBg,
        tone.border,
      )}
    >
      <HawkIcon
        icon={toast.icon ?? SEMANTIC_ICON[semantic]}
        size={16}
        className={cn('mt-0.5 shrink-0', tone.text)}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-hawk-1">
        {toast.title && (
          <span className={cn('text-hawk-label font-semibold', tone.onSoft)}>{toast.title}</span>
        )}
        <span className={cn('text-hawk-label', tone.onSoft)}>{toast.message}</span>
      </div>

      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick();
            onDismiss();
          }}
          className={cn(
            'hawk-focusable shrink-0 rounded-hawk-xs text-hawk-caption font-bold hover:underline',
            tone.onSoft,
          )}
        >
          {toast.action.label}
        </button>
      )}

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className={cn('hawk-focusable shrink-0 rounded-hawk-xs p-0.5', tone.onSoft)}
      >
        <HawkIcon icon={IconClose} size={13} />
      </button>
    </div>
  );
}

export interface HawkToastHostProps {
  position?: 'top' | 'bottom';
  container?: HTMLElement | null;
}

/**
 * Mounts once inside a Hawk surface. Renders the queue in a portal.
 *
 * `pointer-events-none` on the stack with `pointer-events-auto` on each toast
 * means the region does not block clicks on whatever sits beneath it — a
 * full-width invisible bar swallowing clicks is a classic toast bug.
 */
export function HawkToastHost({ position = 'top', container }: HawkToastHostProps) {
  const toasts = useHawkToasts();

  if (typeof document === 'undefined' || toasts.length === 0) return null;
  const target = container ?? document.body;

  return createPortal(
    <div
      aria-live="polite"
      className={cn(
        'pointer-events-none fixed inset-x-0 z-hawk-toast flex flex-col items-center gap-hawk-3 p-hawk-6',
        position === 'top' ? 'top-0' : 'bottom-0 flex-col-reverse',
      )}
    >
      {toasts.map((toast) => (
        <HawkToast key={toast.id} toast={toast} onDismiss={() => hawkToast.dismiss(toast.id)} />
      ))}
    </div>,
    target,
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkFeedbackMessageProps {
  title: ReactNode;
  message?: ReactNode;
  semantic?: HawkSemantic;
  icon?: HawkIconComponent;
  action?: ReactNode;
  className?: string;
}

/**
 * An inline feedback block — the result of an action, shown in place.
 *
 * Distinct from a toast: this one stays, and it sits where the action happened
 * rather than at the edge of the screen. Used for form-level results, where a
 * toast would appear far from the field that caused it.
 */
export function HawkFeedbackMessage({
  title,
  message,
  semantic = HawkSemantic.CRITICAL,
  icon,
  action,
  className,
}: HawkFeedbackMessageProps) {
  const tone = quartet(semantic);

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center gap-hawk-3 rounded-hawk-sm border p-hawk-6 text-center',
        tone.softBg,
        tone.border,
        className,
      )}
    >
      <HawkIcon icon={icon ?? SEMANTIC_ICON[semantic]} size={20} className={tone.text} />
      <span className={cn('text-hawk-body font-semibold', tone.onSoft)}>{title}</span>
      {message && <span className={cn('text-hawk-caption', tone.onSoft)}>{message}</span>}
      {action}
    </div>
  );
}
