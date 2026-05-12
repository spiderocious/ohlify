import { Outlet } from 'react-router-dom';

import { ModalHost, ToastHost } from '@ohlify/ui';

import { AppProvider } from './app.provider.js';

export function AppEntrypoint() {
  return (
    <AppProvider>
      <Outlet />
      <ModalHost />
      <ToastHost />
    </AppProvider>
  );
}
