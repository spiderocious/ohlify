import type { ReactNode } from 'react';

import { HawkAvatar } from '../display/avatar.js';
import { HawkIcon } from '../foundation/icon.js';
import { HawkSkeletonLine } from '../foundation/skeleton.js';
import { HawkText } from '../foundation/text.js';
import { IconAlertTriangle } from '../icons/index.js';
import type { HawkIconComponent } from '../icons/index.js';
import { HawkSemantic, quartet } from '../theme/semantic.js';
import { cn } from '../utils/cn.js';

/**
 * The audit log.
 *
 * An operator-action record. Three things make it different from a generic
 * activity feed, and all three come from what it is *for*:
 *
 * - **The actor is always named.** An audit entry with no actor is not an audit
 *   entry. `actor` is a required prop.
 * - **Before/after values are shown side by side** when a change is recorded.
 *   "Changed the withdrawal limit" is not auditable; "₦50,000 → ₦200,000" is.
 * - **High-gravity actions are marked.** A manual journal or a KYC rejection is
 *   visually distinct from a login, because an operator scanning for the
 *   consequential entries should not have to read every row.
 */
export interface HawkAuditEntry {
  id: string;
  /** Who did it. Required — an audit entry with no actor is not an audit entry. */
  actor: string;
  actorRole?: string;
  /** What they did, in plain language. */
  action: string;
  /** What it was done to — "Withdrawal #4821". */
  target?: string;
  timestamp: string;
  /** Recorded field changes. */
  changes?: ReadonlyArray<{ field: string; before?: string; after?: string }>;
  /** Marks an irreversible or money-moving action. */
  highGravity?: boolean;
  icon?: HawkIconComponent;
  /** IP or device, when captured. */
  origin?: string;
}

export function HawkAuditRow({ entry, className }: { entry: HawkAuditEntry; className?: string }) {
  const tone = quartet(entry.highGravity ? HawkSemantic.CAUTION : HawkSemantic.NEUTRAL);

  return (
    <div
      className={cn(
        'flex gap-hawk-5 border-b border-hawk-line px-hawk-pad py-hawk-row-y',
        entry.highGravity && 'bg-hawk-caution-soft/30',
        className,
      )}
    >
      <HawkAvatar name={entry.actor} size="sm" />

      <div className="flex min-w-0 flex-1 flex-col gap-hawk-2">
        <div className="flex flex-wrap items-baseline gap-hawk-3">
          <HawkText variant="label" ink="strong" className="font-semibold">
            {entry.actor}
          </HawkText>
          {entry.actorRole && (
            <span className="rounded-hawk-xs bg-hawk-sunken px-hawk-3 text-hawk-tiny font-bold uppercase tracking-hawk-overline text-hawk-ink-muted">
              {entry.actorRole}
            </span>
          )}
          <HawkText variant="label" ink="muted">
            {entry.action}
          </HawkText>
          {entry.target && (
            <HawkText variant="label" ink="strong" record>
              {entry.target}
            </HawkText>
          )}
          {entry.highGravity && (
            <HawkIcon
              icon={IconAlertTriangle}
              size={12}
              label="High-gravity action"
              className={tone.text}
            />
          )}
        </div>

        {entry.changes && entry.changes.length > 0 && (
          <div className="flex flex-col gap-hawk-1 rounded-hawk-xs bg-hawk-stock px-hawk-4 py-hawk-3">
            {entry.changes.map((change) => (
              <div
                key={change.field}
                className="flex flex-wrap items-baseline gap-hawk-3 text-hawk-caption"
              >
                <span className="text-hawk-ink-muted">{change.field}</span>
                {/* An added value has no `before`; a cleared one has no `after`.
                    Rendering an em dash for the missing half is honest about
                    which it was. */}
                <span className="hawk-record text-hawk-ink-disabled line-through">
                  {change.before ?? '—'}
                </span>
                <span className="text-hawk-ink-disabled">→</span>
                <span className="hawk-record font-semibold text-hawk-ink-strong">
                  {change.after ?? '—'}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-hawk-4">
          <HawkText variant="tiny" ink="disabled" record>
            {entry.timestamp}
          </HawkText>
          {entry.origin && (
            <HawkText variant="tiny" ink="disabled" record>
              {entry.origin}
            </HawkText>
          )}
        </div>
      </div>
    </div>
  );
}

export function HawkAuditLog({
  entries,
  emptyMessage = 'No activity recorded',
  className,
}: {
  entries: ReadonlyArray<HawkAuditEntry>;
  emptyMessage?: string;
  className?: string;
}) {
  if (entries.length === 0) {
    return (
      <div className={cn('hawk-board p-hawk-12 text-center', className)}>
        <HawkText variant="caption" ink="muted">
          {emptyMessage}
        </HawkText>
      </div>
    );
  }

  return (
    <div className={cn('hawk-board flex flex-col', className)}>
      {entries.map((entry) => (
        <HawkAuditRow key={entry.id} entry={entry} />
      ))}
    </div>
  );
}

export function HawkAuditLogSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="hawk-board flex flex-col">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex gap-hawk-5 border-b border-hawk-line px-hawk-pad py-hawk-row-y"
        >
          <HawkSkeletonLine widthFactor={1} height={32} className="w-8 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-hawk-2">
            <HawkSkeletonLine widthFactor={0.55} height={11} />
            <HawkSkeletonLine widthFactor={0.3} height={9} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkConfigFieldProps {
  label: string;
  description?: ReactNode;
  children: ReactNode;
  /** The value currently live, when the editor is dirty. */
  currentValue?: ReactNode;
  /** The field has been edited but not saved. */
  dirty?: boolean;
  /** Marks a setting that moves money or changes limits. */
  highImpact?: boolean;
  className?: string;
}

/**
 * One configuration setting.
 *
 * Shows the live value beside the editor whenever the field is dirty. An
 * operator changing a platform fee needs to see what it *is* while typing what
 * it will become — a config screen that hides the current value invites
 * exactly the mistake it is being edited to fix.
 */
export function HawkConfigField({
  label,
  description,
  children,
  currentValue,
  dirty = false,
  highImpact = false,
  className,
}: HawkConfigFieldProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-hawk-3 border-b border-hawk-line py-hawk-6',
        dirty && 'border-l-2 border-l-hawk-acc pl-hawk-5',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-hawk-3">
        <HawkText variant="label" ink="strong" className="font-semibold">
          {label}
        </HawkText>
        {highImpact && (
          <span className="inline-flex items-center gap-hawk-2 rounded-hawk-xs bg-hawk-caution-soft px-hawk-3 py-px text-hawk-tiny font-bold uppercase tracking-hawk-overline text-hawk-caution-on-soft">
            <HawkIcon icon={IconAlertTriangle} size={10} />
            High impact
          </span>
        )}
        {dirty && (
          <span className="rounded-hawk-xs bg-hawk-acc-soft px-hawk-3 py-px text-hawk-tiny font-bold uppercase tracking-hawk-overline text-hawk-acc-on-soft">
            Unsaved
          </span>
        )}
      </div>

      {description && (
        <HawkText variant="caption" ink="muted">
          {description}
        </HawkText>
      )}

      <div className="max-w-md">{children}</div>

      {dirty && currentValue !== undefined && (
        <HawkText variant="caption" ink="disabled" record>
          Currently live: {currentValue}
        </HawkText>
      )}
    </div>
  );
}

/** A titled group of config fields. */
export function HawkConfigSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('hawk-board flex flex-col gap-hawk-3', className)}>
      <HawkText variant="medium" ink="strong" as="h3">
        {title}
      </HawkText>
      {description && (
        <HawkText variant="caption" ink="muted">
          {description}
        </HawkText>
      )}
      <div className="flex flex-col">{children}</div>
    </section>
  );
}

/**
 * The save-diff summary.
 *
 * Lists exactly what is about to change before a config save commits. Paired
 * with a typed confirm on any high-impact field — CONTRACTS §4.1.
 */
export function HawkConfigDiff({
  changes,
  className,
}: {
  changes: ReadonlyArray<{ field: string; before: string; after: string; highImpact?: boolean }>;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-hawk-3', className)}>
      {changes.map((change) => (
        <div
          key={change.field}
          className={cn(
            'flex flex-col gap-hawk-1 rounded-hawk-sm px-hawk-4 py-hawk-3',
            change.highImpact ? 'bg-hawk-caution-soft' : 'bg-hawk-stock',
          )}
        >
          <HawkText variant="caption" ink="muted">
            {change.field}
          </HawkText>
          <div className="flex flex-wrap items-baseline gap-hawk-3 text-hawk-label">
            <span className="hawk-record text-hawk-ink-disabled line-through">{change.before}</span>
            <span className="text-hawk-ink-disabled">→</span>
            <span className="hawk-record font-semibold text-hawk-ink-strong">{change.after}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
