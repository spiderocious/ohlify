import { RouterProvider } from 'react-router-dom';

import { router } from './app.routes.js';

export function App() {
  return <RouterProvider router={router} />;
}
