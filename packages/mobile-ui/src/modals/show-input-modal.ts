import { modalStore, type InputModalOptions, type ModalHandle } from './modal-store';

/** Equivalent of `DrawerService.instance.showInputModal(...)`. */
export function showInputModal(
  title: string,
  message: string,
  options?: InputModalOptions,
): ModalHandle {
  return modalStore.addInput(title, message, options);
}
