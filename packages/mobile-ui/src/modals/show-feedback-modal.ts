import { modalStore, type FeedbackModalOptions } from './modal-store';

/** Equivalent of `DrawerService.instance.showFeedbackModal(...)`. */
export function showFeedbackModal(title: string, message: string, options?: FeedbackModalOptions) {
  return modalStore.addFeedback(title, message, options);
}
