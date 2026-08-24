import type { ReactNode } from 'react';

import { HawkKeyValue } from '../display/stat.js';
import { HawkIcon } from '../foundation/icon.js';
import { HawkSkeletonLine } from '../foundation/skeleton.js';
import { HawkText } from '../foundation/text.js';
import { IconAlertTriangle, IconCheck } from '../icons/index.js';
import { HawkSideSheet } from '../modals/modal.js';
import { HAWK_HAZARD, HawkSemantic, quartet } from '../theme/semantic.js';
import { cn } from '../utils/cn.js';

/**
 * The detail drawer — the admin's most-used overlay.
 *
 * Its job is to **make approval safe**. Amount, bank, account number and the
 * verified-identity match are all on screen before the operator can act;
 * approving a payout to a name that does not match the KYC identity is how a
 * marketplace loses money it cannot recover.
 *
 * Compound rather than a props bag, for the same reason `Pass` is: the sections
 * vary per module (a withdrawal drawer and a KYC drawer share the shell and
 * nothing else), and a single component covering both would end up with two
 * disjoint halves of optional props.
 */
export interface HawkDetailDrawerRootProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  /** The action row, pinned at the bottom. */
  actions?: ReactNode;
  className?: string;
}

function DrawerRoot({
  open,
  onClose,
  title,
  subtitle,
  children,
  actions,
  className,
}: HawkDetailDrawerRootProps) {
  return (
    <HawkSideSheet
      open={open}
      onClose={onClose}
      title={
        <span className="flex flex-col gap-hawk-1">
          <span>{title}</span>
          {subtitle && (
            <HawkText variant="caption" ink="muted" record>
              {subtitle}
            </HawkText>
          )}
        </span>
      }
      footer={actions}
      className={cn('hawk-board', className)}
    >
      <div className="flex flex-col gap-hawk-7">{children}</div>
    </HawkSideSheet>
  );
}

/** A titled group of key-values. */
function DrawerSection({
  title,
  children,
  className,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('flex flex-col gap-hawk-2', className)}>
      {title && (
        <HawkText variant="overline" ink="muted">
          {title}
        </HawkText>
      )}
      <div className="flex flex-col divide-y divide-hawk-line">{children}</div>
    </section>
  );
}

/** One labelled fact. Re-exported from the display layer for symmetry. */
const DrawerRow = HawkKeyValue;

/**
 * The name-match check — **the point of this drawer**.
 *
 * Compares the name on the payout destination against the name on the verified
 * identity, and states the verdict rather than showing two strings and hoping
 * the operator compares them. A mismatch escalates to hazard: it is a condition
 * the system detected, not an action anyone took.
 *
 * `match` is deliberately a three-state (`true` / `false` / `undefined`), not a
 * boolean. "Not checked" must never render as "matches" — that is the exact
 * failure mode this control exists to prevent.
 */
function DrawerNameMatch({
  accountName,
  verifiedName,
  match,
  className,
}: {
  accountName: string;
  verifiedName: string;
  match?: boolean;
  className?: string;
}) {
  const tone =
    match === true
      ? quartet(HawkSemantic.SUCCESS)
      : match === false
        ? HAWK_HAZARD
        : quartet(HawkSemantic.CAUTION);

  const verdict =
    match === true
      ? 'Names match'
      : match === false
        ? 'Names do not match'
        : 'Not verified — check manually';

  return (
    <div
      className={cn('flex flex-col gap-hawk-3 rounded-hawk-sm border p-hawk-5', tone.softBg, tone.border, className)}
    >
      <div className="flex items-center gap-hawk-3">
        <HawkIcon
          icon={match === true ? IconCheck : IconAlertTriangle}
          size={15}
          className={tone.text}
        />
        <HawkText variant="label" className={cn('font-semibold', tone.onSoft)}>
          {verdict}
        </HawkText>
      </div>
      <div className="flex flex-col gap-hawk-1">
        <span className={cn('hawk-record text-hawk-caption', tone.onSoft)}>
          Account: {accountName}
        </span>
        <span className={cn('hawk-record text-hawk-caption', tone.onSoft)}>
          Verified: {verifiedName}
        </span>
      </div>
    </div>
  );
}

/** The drawer skeleton, mirroring its own layout. */
function DrawerSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className="flex flex-col gap-hawk-7"
    >
      <div className="flex flex-col gap-hawk-3">
        <HawkSkeletonLine widthFactor={0.25} height={9} />
        {[0.9, 0.7, 0.8, 0.6].map((factor, index) => (
          <div key={index} className="flex items-center justify-between gap-hawk-6 py-hawk-3">
            <HawkSkeletonLine widthFactor={0.3} height={10} />
            <HawkSkeletonLine widthFactor={factor * 0.4} height={11} />
          </div>
        ))}
      </div>
      <HawkSkeletonLine widthFactor={1} height={70} />
    </div>
  );
}

export const HawkDetailDrawer = {
  Root: DrawerRoot,
  Section: DrawerSection,
  Row: DrawerRow,
  NameMatch: DrawerNameMatch,
  Skeleton: DrawerSkeleton,
};
