import type { ReactNode } from 'react';

import { AppText, cn } from '@ohlify/ui';

interface InfoCardProps {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Render children with no internal padding (e.g. for an internal table). */
  flush?: boolean;
}

/**
 * Bordered card with an optional title row + actions cluster. The
 * day-to-day grouping container for full-page detail layouts. Use
 * `<DetailRow>` inside for label/value pairs, or arbitrary children.
 */
export function InfoCard({ title, actions, children, className, flush }: InfoCardProps) {
  return (
    <section className={cn('overflow-hidden rounded-lg border border-border bg-surface', className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          {title ? (
            <AppText
              variant="bodySmall"
              className="text-[11px] font-bold uppercase tracking-wider text-text-muted"
            >
              {title}
            </AppText>
          ) : (
            <span />
          )}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={flush ? '' : 'px-4 py-3 sm:px-5 sm:py-4'}>{children}</div>
    </section>
  );
}
