import type { ReactNode } from 'react';

import { AppText } from '@ohlify/ui';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Slot rendered above the title — typically a back link / breadcrumb. */
  topSlot?: ReactNode;
}

/**
 * Consistent page chrome: optional top slot (back link), title (left),
 * subtitle below it, action cluster on the right. Stacks vertically on
 * small screens so action buttons don't bleed out.
 */
export function PageHeader({ title, subtitle, actions, topSlot }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border bg-surface px-4 py-4 sm:px-6 sm:py-5">
      {topSlot && <div>{topSlot}</div>}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <AppText as="h1" variant="title" className="text-xl font-bold text-text-primary sm:text-2xl">
            {title}
          </AppText>
          {subtitle && (
            <AppText variant="body" className="mt-1 text-text-muted">
              {subtitle}
            </AppText>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">{actions}</div>
        )}
      </div>
    </div>
  );
}
