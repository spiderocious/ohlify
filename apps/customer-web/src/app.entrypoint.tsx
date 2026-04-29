import { Outlet } from 'react-router-dom';

import { AppProvider } from './app.provider.js';

/**
 * Top-level layout. Hosts global providers and the React Router outlet.
 * Feature screens render inside <Outlet/>.
 */
export function AppEntrypoint() {
  return (
    <AppProvider>
      <Outlet />
    </AppProvider>
  );
}
