import { Outlet } from 'react-router-dom';

import { ModalHost, ToastHost } from '@ohlify/ui';

import { AppProvider } from './app.provider.js';

/**
 * Top-level layout. Hosts global providers, the modal/toast portals, and the
 * React Router outlet. Mirrors mobile's `App` builder which wraps the router
 * in `ToastOverlay(ModalOverlay(...))`.
 */
export function AppEntrypoint() {
  return (
    <AppProvider>
      <Outlet />
      <ModalHost />
      <ToastHost />
    </AppProvider>
  );
}
