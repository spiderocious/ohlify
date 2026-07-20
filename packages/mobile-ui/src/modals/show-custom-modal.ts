import type { ReactNode } from 'react';

import { modalStore, type CustomModalOptions, type ModalHandle } from './modal-store';

/** Equivalent of `DrawerService.instance.showCustomModal(...)`. */
export function showCustomModal(
  title: string,
  builder: (onDismiss: () => void) => ReactNode,
  options?: CustomModalOptions,
): ModalHandle {
  return modalStore.addCustom(title, builder, options);
}
