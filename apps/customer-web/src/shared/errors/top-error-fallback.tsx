import { AppButton, AppText } from '@ohlify/ui';

interface TopErrorFallbackProps {
  error: unknown;
  /**
   * True when a chunk reload was suppressed by the loop guard. In that case
   * the user needs to refresh manually — we can't fix it from here.
   */
  chunkReloadSuppressed?: boolean;
}

/**
 * Full-screen catastrophic-failure fallback. Used by the top-level
 * boundary in `AppEntrypoint`. Designed to recover even when the app
 * shell is broken — uses minimal primitives and no router.
 */
export function TopErrorFallback({ error, chunkReloadSuppressed }: TopErrorFallbackProps) {
  const message = chunkReloadSuppressed
    ? "We couldn't load the latest app version. Please refresh your browser to continue."
    : 'Something went wrong loading the app.';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-surface-light p-6"
    >
      <AppText variant="header" weight={800} align="center" color="var(--ohl-text-jet)">
        {chunkReloadSuppressed ? 'Update required' : 'App error'}
      </AppText>
      <AppText variant="body" align="center" color="var(--ohl-text-muted)" className="max-w-md">
        {message}
      </AppText>
      <div className="mt-2 flex gap-3">
        <AppButton
          label="Refresh"
          radius={100}
          height={44}
          onPressed={() => window.location.reload()}
        />
      </div>
      {import.meta.env.DEV ? <DevErrorDetails error={error} /> : null}
    </div>
  );
}

function DevErrorDetails({ error }: { error: unknown }) {
  const text =
    error instanceof Error
      ? `${error.name}: ${error.message}\n\n${error.stack ?? ''}`
      : String(error);
  return (
    <pre className="mt-4 max-h-64 max-w-2xl overflow-auto rounded-lg bg-background p-3 text-left font-sans text-xs text-text-muted">
      {text}
    </pre>
  );
}
