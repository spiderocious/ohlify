import { DrawerService } from '@ohlify/ui';

import type { ApiError } from '@ohlify/api';

/**
 * Promise-based confirmation prompt. Resolves true on confirm, false on
 * cancel. Wraps DrawerService so feature code reads:
 *
 *   if (await confirm({ title: 'Suspend user?', destructive: true })) ...
 */
export function confirm(opts: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}): Promise<boolean> {
  return new Promise((resolve) => {
    DrawerService.showConfirmationModal(opts.title, opts.message, {
      destructive: opts.destructive,
      confirmButtonText: opts.confirmLabel ?? (opts.destructive ? 'Confirm' : 'OK'),
      cancelButtonText: opts.cancelLabel ?? 'Cancel',
      showCancelButton: true,
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });
}

/**
 * Promise-based prompt that asks for a single string and won't resolve
 * until the user supplies one or cancels. Used for "give me a reason"
 * prompts (rejection notes, force-fail reasons, etc).
 */
export function promptForReason(opts: {
  title: string;
  message: string;
  placeholder?: string;
  confirmLabel?: string;
}): Promise<string | null> {
  return new Promise((resolve) => {
    DrawerService.showInputModal(opts.title, opts.message, {
      placeholder: opts.placeholder,
      confirmButtonText: opts.confirmLabel ?? 'Submit',
      showCancelButton: true,
      multiline: true,
      maxLength: 2000,
      onConfirm: (value) => resolve(value.trim() === '' ? null : value.trim()),
      onCancel: () => resolve(null),
    });
  });
}

export function toastSuccess(message: string) {
  DrawerService.toast(message, { type: 'success', duration: 3000 });
}

export function toastError(err: ApiError | string | { message?: string }) {
  const message = typeof err === 'string' ? err : err.message ?? 'Something went wrong.';
  DrawerService.toast(message, { type: 'error', duration: 4000 });
}
