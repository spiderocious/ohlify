import { Outlet } from 'react-router-dom';

import { AppProvider } from './app.provider.js';

export function AppEntrypoint() {
  return (
    <AppProvider>
      <Outlet />
    </AppProvider>
  );
}
