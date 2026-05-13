import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';

import { ModalHost, ToastHost } from '@ohlify/ui';

import { AppProvider } from './app.provider.js';
import {
  AppErrorBoundary,
  clearChunkReloadSentinel,
  isChunkLoadError,
  reportError,
} from './shared/errors/index.js';

/**
 * Top-level layout. Hosts global providers, the modal/toast portals, and the
 * React Router outlet. Mirrors mobile's `App` builder which wraps the router
 * in `ToastOverlay(ModalOverlay(...))`.
 *
 * Wraps the tree in an app-wide `AppErrorBoundary` so render-time crashes
 * surface a controlled fallback instead of a blank screen. Also installs
 * window-level listeners for async failures that won't bubble through
 * React (event handlers, unhandled promise rejections).
 */
export function AppEntrypoint() {
  useGlobalErrorListeners();

  return (
    <AppErrorBoundary scope="top">
      <AppProvider>
        <Outlet />
        <ModalHost />
        <ToastHost />
      </AppProvider>
    </AppErrorBoundary>
  );
}

function useGlobalErrorListeners(): void {
  useEffect(() => {
    // A successful mount past the boundary means whatever chunk we were
    // missing has now loaded — clear the sentinel so a future deploy can
    // trigger a fresh reload cycle.
    clearChunkReloadSentinel();

    const onError = (event: ErrorEvent) => {
      // Chunk failures often arrive as a top-level window error before
      // React's boundary sees them. We just log here — the boundary's
      // own onError handler triggers the actual reload when React
      // surfaces the chunk-load failure.
      if (isChunkLoadError(event.error)) {
        reportError(event.error, { scope: 'global' });
        return;
      }
      reportError(event.error ?? event.message, { scope: 'global' });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      reportError(event.reason, { scope: 'unhandled-rejection' });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);
}
