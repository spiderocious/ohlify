import type { ReactNode } from 'react';

import { HawkButton } from '../actions/button.js';
import { HawkIcon } from '../foundation/icon.js';
import { HawkText } from '../foundation/text.js';
import {
  IconAlertTriangle,
  IconCheck,
  IconLock,
  IconShield,
} from '../icons/index.js';
import type { HawkIconComponent } from '../icons/index.js';
import { HAWK_HAZARD, HawkSemantic, quartet } from '../theme/semantic.js';
import { cn } from '../utils/cn.js';

import { HawkStatusBadge } from '../status/badge.js';
import type { HawkStatus } from '../status/lifecycle.js';

export interface HawkKycStepProps {
  label: string;
  description?: string;
  status: HawkStatus;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}

/**
 * One step in the KYC flow.
 *
 * The action is offered on every step that is not verified, including one under
 * review — because "under review" is exactly when a user most wants to know
 * they can still check what they submitted.
 */
export function HawkKycStep({
  label,
  description,
  status,
  onAction,
  actionLabel = 'Continue',
  className,
}: HawkKycStepProps) {
  const done = status.key === 'verified';

  return (
    <div
      className={cn(
        'flex items-center gap-hawk-5 px-hawk-pad py-hawk-row-y',
        className,
      )}
    >
      <span
        className={cn(
          'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          done
            ? 'bg-hawk-success-soft text-hawk-success'
            : quartet(status.semantic).softBg,
          !done && quartet(status.semantic).text,
        )}
      >
        <HawkIcon icon={done ? IconCheck : IconShield} size={15} />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-hawk-1">
        <HawkText variant="body" ink="strong" clamp={1}>
          {label}
        </HawkText>
        {description && (
          <HawkText variant="caption" ink="muted" clamp={2}>
            {description}
          </HawkText>
        )}
      </div>

      {done ? (
        <HawkStatusBadge status={status} size="sm" />
      ) : onAction ? (
        <HawkButton label={actionLabel} variant="outline" size="sm" onClick={onAction} />
      ) : (
        <HawkStatusBadge status={status} size="sm" />
      )}
    </div>
  );
}

export interface HawkKycProgressProps {
  /** Steps completed. */
  completed: number;
  total: number;
  title?: string;
  description?: ReactNode;
  className?: string;
}

/** The KYC progress header — how far through verification the user is. */
export function HawkKycProgress({
  completed,
  total,
  title = 'Verify your identity',
  description,
  className,
}: HawkKycProgressProps) {
  const fraction = total === 0 ? 0 : completed / total;

  return (
    <div className={cn('flex flex-col gap-hawk-4', className)}>
      <div className="flex items-baseline justify-between gap-hawk-4">
        <HawkText variant="medium" ink="strong">
          {title}
        </HawkText>
        <HawkText variant="caption" ink="muted" record>
          {completed}/{total}
        </HawkText>
      </div>
      {description && (
        <HawkText variant="caption" ink="muted">
          {description}
        </HawkText>
      )}
      <span className="h-1.5 w-full overflow-hidden rounded-full bg-hawk-sunken">
        <span
          className="hawk-motion block h-full rounded-full bg-hawk-acc transition-[width] duration-hawk-base"
          style={{ width: `${fraction * 100}%` }}
        />
      </span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkStrikeNoticeProps {
  reason: string;
  /** When it was issued. */
  issuedAt?: string;
  /** How many strikes the user now has, and the limit. */
  count?: number;
  limit?: number;
  /** What happens next — suspension, a cooling-off period. */
  consequence?: ReactNode;
  onDispute?: () => void;
  /** The strike has been disputed or voided. */
  status?: HawkStatus;
  className?: string;
}

/**
 * A strike notice.
 *
 * Renders in the **hazard** family rather than critical. The distinction is
 * exact: a strike is something the system has done *to* the user and reports —
 * it is not a button they can press, and it is not an irreversible operator
 * action. CONTRACTS §0.2.
 *
 * The dispute route is always offered. A penalty with no appeal is a support
 * ticket the product could have handled itself.
 */
export function HawkStrikeNotice({
  reason,
  issuedAt,
  count,
  limit,
  consequence,
  onDispute,
  status,
  className,
}: HawkStrikeNoticeProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col gap-hawk-4 rounded-hawk-sm border p-hawk-6',
        HAWK_HAZARD.softBg,
        HAWK_HAZARD.border,
        className,
      )}
    >
      <div className="flex items-start gap-hawk-4">
        <HawkIcon icon={IconAlertTriangle} size={18} className={cn('mt-0.5', HAWK_HAZARD.text)} />
        <div className="flex min-w-0 flex-1 flex-col gap-hawk-2">
          <div className="flex flex-wrap items-center gap-hawk-3">
            <HawkText variant="body" className={cn('font-semibold', HAWK_HAZARD.onSoft)}>
              {reason}
            </HawkText>
            {status && <HawkStatusBadge status={status} size="sm" />}
          </div>
          {issuedAt && (
            <HawkText variant="caption" className={HAWK_HAZARD.onSoft}>
              Issued {issuedAt}
            </HawkText>
          )}
          {count !== undefined && limit !== undefined && (
            <HawkText variant="caption" className={cn('hawk-record', HAWK_HAZARD.onSoft)}>
              Strike {count} of {limit}
            </HawkText>
          )}
        </div>
      </div>

      {consequence && (
        <div className={cn('rounded-hawk-xs bg-white/50 p-hawk-4')}>
          <HawkText variant="caption" className={HAWK_HAZARD.onSoft}>
            {consequence}
          </HawkText>
        </div>
      )}

      {onDispute && (
        <HawkButton label="Dispute this" variant="outline" size="sm" onClick={onDispute} />
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkUpgradeGateProps {
  title: string;
  description?: ReactNode;
  /** What the user must do — "Verify your identity". */
  actionLabel?: string;
  onAction?: () => void;
  icon?: HawkIconComponent;
  /** What they would gain. Listing the benefit beats naming the barrier. */
  benefits?: readonly string[];
  className?: string;
}

/**
 * An upgrade gate — a feature the user cannot reach yet.
 *
 * Leads with what unlocking gives them, not with what is blocked. "Verify to
 * start earning" is a reason; "You are not verified" is a wall. The distinction
 * is the whole design of this component.
 */
export function HawkUpgradeGate({
  title,
  description,
  actionLabel = 'Get started',
  onAction,
  icon = IconLock,
  benefits,
  className,
}: HawkUpgradeGateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-hawk-5 rounded-hawk border border-hawk-line',
        'bg-hawk-paper p-hawk-8 text-center',
        className,
      )}
    >
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-hawk-acc-soft text-hawk-acc">
        <HawkIcon icon={icon} size={22} />
      </span>

      <HawkText variant="medium" ink="strong">
        {title}
      </HawkText>

      {description && (
        <HawkText variant="caption" ink="muted" className="max-w-sm">
          {description}
        </HawkText>
      )}

      {benefits && benefits.length > 0 && (
        <ul className="flex w-full max-w-xs flex-col gap-hawk-3 text-left">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-hawk-3">
              <HawkIcon icon={IconCheck} size={14} className="mt-0.5 text-hawk-success" />
              <HawkText variant="caption" ink="default">
                {benefit}
              </HawkText>
            </li>
          ))}
        </ul>
      )}

      {onAction && <HawkButton label={actionLabel} block onClick={onAction} />}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkTrustBadgeProps {
  label: string;
  /** Verified, escrow-protected, and so on. */
  icon?: HawkIconComponent;
  semantic?: HawkSemantic;
  className?: string;
}

/** A small trust marker — "Escrow protected", "Identity verified". */
export function HawkTrustBadge({
  label,
  icon = IconShield,
  semantic = HawkSemantic.SUCCESS,
  className,
}: HawkTrustBadgeProps) {
  const tone = quartet(semantic);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-hawk-2 rounded-hawk-pill px-hawk-4 py-hawk-1',
        tone.softBg,
        tone.onSoft,
        className,
      )}
    >
      <HawkIcon icon={icon} size={12} />
      <span className="text-hawk-caption font-semibold">{label}</span>
    </span>
  );
}
