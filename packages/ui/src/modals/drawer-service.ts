import { drawerStore } from './store.js';

/**
 * Imperative API. Mirrors mobile/lib/shared/services/drawer_service.dart.
 * Just like Flutter, the API is a singleton — feature code never reaches for a
 * provider. Mount <ModalHost /> + <ToastHost /> once at the app root and
 * call DrawerService.toast(...) / .showFeedbackModal(...) from anywhere.
 */
export const DrawerService = {
  toast: drawerStore.toast.bind(drawerStore),
  showFeedbackModal: drawerStore.showFeedbackModal.bind(drawerStore),
  showConfirmationModal: drawerStore.showConfirmationModal.bind(drawerStore),
  showInputModal: drawerStore.showInputModal.bind(drawerStore),
  showCustomModal: drawerStore.showCustomModal.bind(drawerStore),
  dismissAll: drawerStore.dismissAll.bind(drawerStore),
  dismissAllModals: drawerStore.dismissAllModals.bind(drawerStore),
  dismissAllToasts: drawerStore.dismissAllToasts.bind(drawerStore),
};
