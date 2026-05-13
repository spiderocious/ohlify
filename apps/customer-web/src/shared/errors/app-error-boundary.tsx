import { useState, type ReactNode } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { useLocation } from 'react-router-dom';

import { attemptChunkReload } from './chunk-reload.js';
import { isChunkLoadError } from './is-chunk-load-error.js';
import { reportError } from './report.js';
import { RouteErrorFallback } from './route-error-fallback.js';
import { TopErrorFallback } from './top-error-fallback.js';

interface AppErrorBoundaryProps {
  scope: 'top' | 'route';
  children: ReactNode;
}

/**
 * Two-tier error boundary built on `react-error-boundary`.
 *
 *   - `scope="top"` wraps the entire app in `AppEntrypoint`. Catches
 *     provider / router / global crashes. Always full-screen.
 *
 *   - `scope="route"` wraps `<Outlet />` inside route layouts. Auto-resets
 *     when the user navigates (via `resetKeys={[pathname]}`). Shows an
 *     inline fallback while the shell stays interactive.
 *
 * On either scope, a detected chunk-load error triggers a one-shot
 * sentinel-protected reload via `attemptChunkReload()`. If the sentinel
 * suppressed the reload (already attempted recently), the top fallback
 * renders a "please refresh manually" UI instead.
 */
export function AppErrorBoundary({ scope, children }: AppErrorBoundaryProps) {
  if (scope === 'top') {
    return <TopBoundary>{children}</TopBoundary>;
  }
  return <RouteBoundary>{children}</RouteBoundary>;
}

function TopBoundary({ children }: { children: ReactNode }) {
  // Stays `true` once a reload was suppressed by the loop guard — we render
  // the "refresh manually" UI for the rest of this session.
  const [chunkReloadSuppressed, setChunkReloadSuppressed] = useState(false);

  return (
    <ErrorBoundary
      fallbackRender={({ error }: FallbackProps) => (
        <TopErrorFallback error={error} chunkReloadSuppressed={chunkReloadSuppressed} />
      )}
      onError={(error, info) => {
        if (isChunkLoadError(error)) {
          const reloaded = attemptChunkReload();
          if (!reloaded) setChunkReloadSuppressed(true);
          // Either way, also log so devs see what happened.
          reportError(error, { scope: 'top', info });
          return;
        }
        reportError(error, { scope: 'top', info });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

function RouteBoundary({ children }: { children: ReactNode }) {
  // `resetKeys` lets the library auto-reset the boundary when the user
  // navigates away — without this, the fallback would persist forever even
  // after a successful navigation.
  const location = useLocation();
  return (
    <ErrorBoundary
      resetKeys={[location.pathname]}
      fallbackRender={(props: FallbackProps) => <RouteErrorFallback {...props} />}
      onError={(error, info) => {
        if (isChunkLoadError(error)) {
          // Chunk errors at the route level should still hard-reload — the
          // user can't recover by clicking "Try again" since the chunk is
          // permanently gone. The top-level boundary's chunkReloadSuppressed
          // state will catch a loop if the reload doesn't fix things.
          attemptChunkReload();
          reportError(error, { scope: 'route', info });
          return;
        }
        reportError(error, { scope: 'route', info });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
