import type { ReactNode } from 'react';

import { AppText } from '@ohlify/ui';

interface SectionProps {
  title: string;
  /** Path under mobile/lib/ui/widgets/ that this section ports. */
  mobileFile?: string;
  children: ReactNode;
}

export function Section({ title, mobileFile, children }: SectionProps) {
  return (
    <section className="mt-12">
      <div className="mb-4 flex items-baseline gap-3">
        <AppText as="h2" variant="header">
          {title}
        </AppText>
        {mobileFile ? (
          <code className="text-xs text-text-muted">mobile/lib/ui/widgets/{mobileFile}</code>
        ) : null}
      </div>
      <div className="rounded-md border border-border bg-surface-light/40 p-6">{children}</div>
    </section>
  );
}
