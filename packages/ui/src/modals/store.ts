import type { ReactNode } from 'react';

import type {
  ConfirmationModalOptions,
  CustomModalOptions,
  DrawerHandle,
  FeedbackModalOptions,
  InputModalOptions,
  ModalEntry,
  ToastEntry,
  ToastOptions,
} from './types.js';

type Listener = () => void;

let counter = 0;
const newId = (prefix: string) => `${prefix}_${counter++}`;

class Store {
  private modals: ModalEntry[] = [];
  private toasts: ToastEntry[] = [];
  private listeners = new Set<Listener>();
  private toastTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private feedbackTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private modalDismissers = new Map<string, () => void>();

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  }

  private emit(): void {
    this.listeners.forEach((l) => l());
  }

  getModals(): ReadonlyArray<ModalEntry> {
    return this.modals;
  }

  getToasts(): ReadonlyArray<ToastEntry> {
    return this.toasts;
  }

  // ── Modals ──────────────────────────────────────────────────────────────

  private pushModal(entry: ModalEntry): DrawerHandle {
    let resolve!: () => void;
    const promise = new Promise<void>((r) => {
      resolve = r;
    });

    this.modals = [...this.modals, entry];

    const dismiss = () => {
      if (!this.modals.some((m) => m.id === entry.id)) return;
      this.modals = this.modals.filter((m) => m.id !== entry.id);
      this.modalDismissers.delete(entry.id);
      const t = this.feedbackTimers.get(entry.id);
      if (t) {
        clearTimeout(t);
        this.feedbackTimers.delete(entry.id);
      }
      this.emit();
      resolve();
    };

    this.modalDismissers.set(entry.id, dismiss);
    this.emit();
    return { dismiss, onDismissed: promise };
  }

  /** Dismiss a single modal by id. Used by ModalHost when user closes it. */
  dismissModal(id: string): void {
    const fn = this.modalDismissers.get(id);
    if (fn) fn();
  }

  showFeedbackModal(
    title: string,
    message: string,
    options: FeedbackModalOptions = {},
  ): DrawerHandle {
    const id = newId('modal');
    const handle = this.pushModal({ id, kind: 'feedback', title, message, options });
    if (options.autoDismiss) {
      const dur = options.autoDismissDuration ?? 4000;
      const t = setTimeout(() => handle.dismiss(), dur);
      this.feedbackTimers.set(id, t);
    }
    return handle;
  }

  showConfirmationModal(
    title: string,
    message: string,
    options: ConfirmationModalOptions = {},
  ): DrawerHandle {
    return this.pushModal({
      id: newId('modal'),
      kind: 'confirmation',
      title,
      message,
      options,
    });
  }

  showInputModal(title: string, message: string, options: InputModalOptions = {}): DrawerHandle {
    return this.pushModal({ id: newId('modal'), kind: 'input', title, message, options });
  }

  showCustomModal(
    title: string,
    render: (onDismiss: () => void) => ReactNode,
    options: CustomModalOptions = {},
  ): DrawerHandle {
    return this.pushModal({ id: newId('modal'), kind: 'custom', title, render, options });
  }

  dismissAllModals(): void {
    Array.from(this.modalDismissers.values()).forEach((fn) => fn());
  }

  // ── Toasts ──────────────────────────────────────────────────────────────

  toast(message: string, options: ToastOptions = {}): DrawerHandle {
    const id = newId('toast');
    const merged: ToastEntry['options'] = {
      type: options.type ?? 'success',
      position: options.position ?? 'top',
      duration: options.duration ?? 4000,
      dismissible: options.dismissible ?? true,
      showIcon: options.showIcon ?? true,
      sticky: options.sticky ?? false,
      fullWidth: options.fullWidth ?? false,
      ...(options.icon !== undefined ? { icon: options.icon } : {}),
    };
    const entry: ToastEntry = { id, message, options: merged };
    this.toasts = [...this.toasts, entry];
    this.emit();

    let resolve!: () => void;
    const promise = new Promise<void>((r) => {
      resolve = r;
    });

    const dismiss = () => {
      const t = this.toastTimers.get(id);
      if (t) {
        clearTimeout(t);
        this.toastTimers.delete(id);
      }
      if (!this.toasts.some((x) => x.id === id)) return;
      this.toasts = this.toasts.filter((x) => x.id !== id);
      this.emit();
      resolve();
    };

    if (!merged.sticky) {
      const t = setTimeout(dismiss, merged.duration);
      this.toastTimers.set(id, t);
    }

    return { dismiss, onDismissed: promise };
  }

  dismissToast(id: string): void {
    if (!this.toasts.some((x) => x.id === id)) return;
    const t = this.toastTimers.get(id);
    if (t) {
      clearTimeout(t);
      this.toastTimers.delete(id);
    }
    this.toasts = this.toasts.filter((x) => x.id !== id);
    this.emit();
  }

  dismissAllToasts(): void {
    this.toastTimers.forEach((t) => clearTimeout(t));
    this.toastTimers.clear();
    this.toasts = [];
    this.emit();
  }

  dismissAll(): void {
    this.dismissAllModals();
    this.dismissAllToasts();
  }
}

export const drawerStore = new Store();
