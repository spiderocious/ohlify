import { toastStore, type ToastOptions } from './toast-store';

/**
 * Equivalent of `DrawerService.instance.toast(...)` — no separate DI/init
 * step needed since toastStore is a plain module singleton (RN has no
 * widget-tree-scoped notifier requirement the way Provider does).
 */
export function showToast(message: string, options?: ToastOptions) {
  return toastStore.add(message, options);
}
