import type { ReactNode } from 'react';

import { AppText, cn } from '@ohlify/ui';

import { StatusPill } from '../../../shared/parts/status-pill.js';

interface ConfigSectionProps {
  title: string;
  /** How many fields in this section have unsaved edits. Renders the chip. */
  dirtyCount: number;
  children: ReactNode;
}

export function ConfigSection({ title, dirtyCount, children }: ConfigSectionProps) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-lg border bg-surface',
        dirtyCount > 0 ? 'border-amber-300 bg-amber-50/20' : 'border-border',
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-border bg-surface-light px-5 py-3">
        <AppText variant="bodyTitle" className="text-text-primary">
          {title}
        </AppText>
        {dirtyCount > 0 && (
          <StatusPill
            label={`${dirtyCount} unsaved`}
            tone="warning"
          />
        )}
      </header>
      <div className="divide-y divide-border/60">{children}</div>
    </section>
  );
}

interface ConfigRowProps {
  label: string;
  help?: string;
  keyName: string;
  isPublic?: boolean;
  isDirty?: boolean;
  updatedAt?: string;
  children: ReactNode;
}

/**
 * One field row — label + help text on the left, control on the right at
 * ≥sm; stacked vertically below sm. Shows the raw key + Public/Modified
 * pills under the label so the operator can correlate with backend logs.
 */
export function ConfigRow({
  label,
  help,
  keyName,
  isPublic,
  isDirty,
  children,
}: ConfigRowProps) {
  return (
    <div className="grid grid-cols-1 items-start gap-3 px-5 py-4 sm:grid-cols-[1fr_320px] sm:gap-6">
      <div className="min-w-0">
        <div className="flex-col flex items-start">
        <AppText variant="body" className="font-semibold text-text-primary">
          {label}
        </AppText>
        {help && (
          <AppText variant="bodySmall" className="mt-0.5 text-text-muted">
            {help}
          </AppText>
          )}
          </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <code className="text-[10px] text-text-muted">{keyName}</code>
          {isPublic && <StatusPill label="Public" tone="info" />}
          {isDirty && <StatusPill label="Modified" tone="warning" />}
        </div>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
