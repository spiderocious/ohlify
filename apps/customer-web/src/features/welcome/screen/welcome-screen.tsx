import { Link } from 'react-router-dom';

import { ROUTES } from '@ohlify/core';
import { AppText, IconSparkles } from '@ohlify/ui';

export function WelcomeScreen() {
  return (
    <main className="min-h-screen bg-surface-light">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-start justify-center gap-6 px-6 py-12">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary text-white">
          <IconSparkles size={22} />
        </div>

        <AppText as="h1" variant="titleLarge">
          Hello Ohlify
        </AppText>

        <AppText as="p" variant="bodyLarge" className="max-w-md text-text-muted">
          The customer web app shell is alive. MonaSans is loaded, the canonical palette is wired
          through CSS variables, and React Router v6 is mounted with typed routes.
        </AppText>

        <div className="mt-2 flex gap-3">
          <Link
            to={ROUTES.COMPONENT_PREVIEW.absPath}
            className="rounded-pill bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
          >
            Component preview
          </Link>
          <a
            href="https://ohlify.com"
            target="_blank"
            rel="noreferrer"
            className="rounded-pill border border-border bg-background px-5 py-3 text-sm font-semibold text-text-primary transition hover:bg-surface"
          >
            ohlify.com
          </a>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Swatch name="primary" className="bg-primary text-white" />
          <Swatch name="secondary" className="bg-secondary text-text-primary" />
          <Swatch name="accent" className="bg-accent text-text-primary" />
          <Swatch name="success" className="bg-success text-white" />
          <Swatch name="warning" className="bg-warning text-white" />
          <Swatch name="error" className="bg-error text-white" />
        </div>
      </div>
    </main>
  );
}

function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <div
      className={`flex h-16 items-center justify-center rounded-md text-xs font-semibold ${className}`}
    >
      {name}
    </div>
  );
}
