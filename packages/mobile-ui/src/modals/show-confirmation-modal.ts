import { modalStore, type ConfirmationModalOptions, type ModalHandle } from './modal-store';

/** Equivalent of `DrawerService.instance.showConfirmationModal(...)`. */
export function showConfirmationModal(
  title: string,
  message: string,
  options?: ConfirmationModalOptions,
): ModalHandle {
  return modalStore.addConfirmation(title, message, options);
}
