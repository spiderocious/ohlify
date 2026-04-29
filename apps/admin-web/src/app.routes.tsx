import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';

import { route } from '@ohlify/core';

import { AppEntrypoint } from './app.entrypoint.js';

/** Admin-local route table — admin routes don't share customer-web's. */
export const ADMIN_ROUTES = route('', {
  ROOT: route(''),
  WELCOME: route('welcome'),
});

const WelcomeScreen = lazy(() =>
  import('./features/welcome/screen/welcome-screen.js').then((m) => ({ default: m.WelcomeScreen })),
);

function lazyRoute(element: React.ReactElement): React.ReactElement {
  return (
    <Suspense fallback={<div className="p-6 text-text-muted">Loading…</div>}>{element}</Suspense>
  );
}

const routes: RouteObject[] = [
  {
    path: ADMIN_ROUTES.ROOT.absPath,
    element: <AppEntrypoint />,
    children: [
      { index: true, element: lazyRoute(<WelcomeScreen />) },
      { path: ADMIN_ROUTES.WELCOME.relativePath, element: lazyRoute(<WelcomeScreen />) },
      { path: '*', element: <Navigate to={ADMIN_ROUTES.ROOT.absPath} replace /> },
    ],
  },
];

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter(routes);
