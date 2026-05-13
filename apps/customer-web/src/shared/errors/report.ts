/**
 * Single chokepoint for error reporting. Currently console-only — wire
 * Sentry / PostHog / etc. here later and every caller benefits without
 * touching the boundary or the global listeners.
 */
export function reportError(
  error: unknown,
  context: {
    scope: 'top' | 'route' | 'global' | 'unhandled-rejection';
    info?: { componentStack?: string | null };
  },
): void {
   
  console.error(`[error:${context.scope}]`, error, context.info);
}
