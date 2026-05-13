import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@ohlify/core';
import { AppButton, AppText } from '@ohlify/ui';

interface RouteErrorFallbackProps {
  error: unknown;
  resetErrorBoundary: () => void;
}

/**
 * Inline route-error fallback. The shell (sidebar / header) stays mounted
 * around it, so the user can navigate away via the nav. "Try again"
 * remounts the route subtree (boundary reset). "Go home" navigates to
 * `/home` — the boundary's `resetKeys={[location.pathname]}` then clears
 * the error automatically.
 */
export function RouteErrorFallback({ error, resetErrorBoundary }: RouteErrorFallbackProps) {
  const navigate = useNavigate();

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center gap-3 px-4 py-12 text-center"
    >
      <AppText variant="header" weight={700} align="center" color="var(--ohl-text-jet)">
        This page didn&apos;t load
      </AppText>
      <AppText variant="body" align="center" color="var(--ohl-text-muted)">
        Something went wrong rendering this screen. You can try again or go back home.
      </AppText>
      <div className="mt-2 flex gap-3">
        <AppButton
          label="Try again"
          variant="outline"
          radius={100}
          height={44}
          onPressed={resetErrorBoundary}
        />
        <AppButton
          label="Go home"
          radius={100}
          height={44}
          onPressed={() => navigate(ROUTES.HOME.absPath)}
        />
      </div>
      {import.meta.env.DEV ? (
        <pre className="mt-4 max-h-48 w-full max-w-xl overflow-auto rounded-lg bg-background p-3 text-left font-sans text-xs text-text-muted">
          {formatError(error)}
        </pre>
      ) : null}
    </div>
  );
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}\n\n${error.stack ?? ''}`;
  }
  return String(error);
}
