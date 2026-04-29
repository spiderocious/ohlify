import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';

import { ROUTES } from '@ohlify/core';

import { AppEntrypoint } from './app.entrypoint.js';

const WelcomeScreen = lazy(() =>
  import('./features/welcome/screen/welcome-screen.js').then((m) => ({ default: m.WelcomeScreen })),
);

const ComponentPreviewScreen = lazy(() =>
  import('./features/component-preview/screen/component-preview-screen.js').then((m) => ({
    default: m.ComponentPreviewScreen,
  })),
);

function lazyRoute(element: React.ReactElement): React.ReactElement {
  return (
    <Suspense fallback={<div className="p-6 text-text-muted">Loading…</div>}>{element}</Suspense>
  );
}

const routes: RouteObject[] = [
  {
    path: ROUTES.ROOT.absPath,
    element: <AppEntrypoint />,
    children: [
      { index: true, element: lazyRoute(<WelcomeScreen />) },
      {
        path: ROUTES.COMPONENT_PREVIEW.relativePath,
        element: lazyRoute(<ComponentPreviewScreen />),
      },
      { path: '*', element: <Navigate to={ROUTES.ROOT.absPath} replace /> },
    ],
  },
];

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter(routes);
