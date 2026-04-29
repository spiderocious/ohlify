import { AppText, IconSparkles } from '@ohlify/ui';

export function WelcomeScreen() {
  return (
    <main className="min-h-screen bg-surface-dark">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-start justify-center gap-6 px-6 py-12">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-text-deep-blue text-white">
          <IconSparkles size={22} />
        </div>

        <AppText as="h1" variant="titleLarge">
          Welcome to Ohlify Admin
        </AppText>

        <AppText as="p" variant="bodyLarge" className="max-w-md text-text-muted">
          Admin shell is wired against the same design system. Real screens land in a later phase —
          for now the router is mounted, MonaSans is loaded, and theme tokens are available.
        </AppText>

        <div className="mt-2 inline-flex items-center gap-2 rounded-pill border border-border bg-background px-3 py-1.5 text-xs font-medium text-text-muted">
          v0.1.0 · scaffold only
        </div>
      </div>
    </main>
  );
}
