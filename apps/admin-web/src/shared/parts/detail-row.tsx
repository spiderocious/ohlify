import type { ReactNode } from 'react';

import { AppText, cn } from '@ohlify/ui';

interface DetailRowProps {
  label: string;
  children: ReactNode;
  className?: string;
}

/**
 * Two-column "label / value" row used inside detail drawers. Keeps every
 * detail panel visually consistent without each module reimplementing the
 * same flexbox.
 */
export function DetailRow({ label, children, className }: DetailRowProps) {
  return (
    <div className={cn('grid grid-cols-[140px_1fr] items-start gap-3 py-2', className)}>
      <AppText variant="bodySmall" className="text-text-muted">
        {label}
      </AppText>
      <div className="min-w-0 break-words text-sm text-text-primary">{children}</div>
    </div>
  );
}

interface DetailSectionProps {
  title?: string;
  children: ReactNode;
}

/** Optional grouping inside a drawer ("Bank account", "Audit trail"). */
export function DetailSection({ title, children }: DetailSectionProps) {
  return (
    <section className="border-t border-border first:border-t-0 px-5 py-4">
      {title && (
        <AppText
          variant="bodySmall"
          className="mb-2 text-[11px] font-bold uppercase tracking-wider text-text-muted"
        >
          {title}
        </AppText>
      )}
      <div className="flex flex-col">{children}</div>
    </section>
  );
}
