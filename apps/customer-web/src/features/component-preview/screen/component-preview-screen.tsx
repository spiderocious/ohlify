import { Link } from 'react-router-dom';

import { ROUTES } from '@ohlify/core';
import { AppText, IconBack } from '@ohlify/ui';

export function ComponentPreviewScreen() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Link
          to={ROUTES.ROOT.absPath}
          className="inline-flex items-center gap-2 text-sm font-medium text-text-muted hover:text-text-primary"
        >
          <IconBack size={16} />
          Back
        </Link>

        <AppText as="h1" variant="titleLarge" className="mt-6">
          Component preview
        </AppText>

        <AppText as="p" variant="bodyMedium" className="mt-2 text-text-muted">
          This route will host every primitive, modal, shell, and domain widget as we port them from
          the mobile app. For now it just proves typography is wired.
        </AppText>

        <section className="mt-8 space-y-4 rounded-md border border-border bg-surface-light p-6">
          <AppText variant="titleMedium">Title medium</AppText>
          <AppText variant="titleSmall">Title small</AppText>
          <AppText variant="bodyLarge">Body large — quick brown fox jumps.</AppText>
          <AppText variant="bodyMedium">Body medium — quick brown fox jumps.</AppText>
          <AppText variant="bodySmall">Body small — quick brown fox jumps.</AppText>
        </section>
      </div>
    </main>
  );
}
