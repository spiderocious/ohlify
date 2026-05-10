import type { ReactNode } from 'react';

import { AppText } from '@ohlify/ui';

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/**
 * Centered card layout for unauthenticated screens (login, TOTP). Sized
 * for a single form column — anything wider should not be on the auth
 * surface.
 */
export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface-light px-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-8 shadow-sm">
        <div className="mb-6 flex items-baseline gap-2">
          <span className="text-2xl font-extrabold text-text-deep-blue">ohlify</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            admin
          </span>
        </div>

        <AppText as="h1" variant="title" className="text-xl font-bold text-text-primary">
          {title}
        </AppText>
        {subtitle && (
          <AppText variant="body" className="mt-1 text-text-muted">
            {subtitle}
          </AppText>
        )}

        <div className="mt-6 flex flex-col gap-4">{children}</div>
      </div>
    </main>
  );
}
