import type { ReactNode } from 'react';

import { HawkFigure } from '../foundation/figure.js';
import { HawkIcon } from '../foundation/icon.js';
import type { HawkKobo } from '../foundation/money.js';
import { HawkSkeleton, HawkSkeletonLine } from '../foundation/skeleton.js';
import { HawkText } from '../foundation/text.js';
import {
  IconChevronRight,
  IconPhone,
  IconVideo,
} from '../icons/index.js';
import type { HawkIconComponent } from '../icons/index.js';
import { HawkMoneyDirection, HawkSemantic, quartet } from '../theme/semantic.js';
import { cn } from '../utils/cn.js';

import { HawkAvatar } from '../display/avatar.js';
import { HawkRating } from '../inputs/selection.js';
import { HawkBadge, HawkStatusBadge, HawkDot } from '../status/badge.js';
import type { HawkStatus } from '../status/lifecycle.js';
import type { HawkPresence } from '../status/badge.js';

/**
 * The ten row shapes.
 *
 * Each is a distinct component rather than one configurable `Row`, because the
 * information hierarchy genuinely differs: a transaction row leads with an
 * amount, a chat row leads with a name and an unread count, a call row leads
 * with a direction glyph. Collapsing them into one props bag would produce a
 * component with thirty optional props and no opinion about any of them.
 *
 * Every one ships its own skeleton mirroring its own layout (CONTRACTS §6).
 */

const ROW = 'flex w-full items-center gap-hawk-5 px-hawk-pad py-hawk-row-y text-left';
const ROW_INTERACTIVE =
  'hawk-focusable transition-colors duration-hawk-fast hover:bg-hawk-hovered';

/* ── 1 · Professional ─────────────────────────────────────────────────────── */

export interface HawkProfessionalRowProps {
  name: string;
  headline?: string;
  avatarUrl?: string;
  ratePerMinuteKobo?: HawkKobo;
  rating?: number;
  reviewCount?: number;
  presence?: HawkPresence;
  verified?: boolean;
  onClick?: () => void;
  className?: string;
}

export function HawkProfessionalRow({
  name,
  headline,
  avatarUrl,
  ratePerMinuteKobo,
  rating,
  reviewCount,
  presence,
  verified,
  onClick,
  className,
}: HawkProfessionalRowProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(ROW, onClick && ROW_INTERACTIVE, className)}
    >
      <HawkAvatar
        name={name}
        src={avatarUrl}
        size="md"
        {...(presence ? { presence } : {})}
        {...(verified ? { verified } : {})}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-hawk-1">
        <HawkText variant="body" ink="strong" clamp={1}>
          {name}
        </HawkText>
        {headline && (
          <HawkText variant="caption" ink="muted" clamp={1}>
            {headline}
          </HawkText>
        )}
        {rating !== undefined && (
          <HawkRating value={rating} readOnly size={11} showValue count={reviewCount} />
        )}
      </div>
      {ratePerMinuteKobo !== undefined && (
        <div className="flex shrink-0 flex-col items-end">
          {/* A public rate is not the viewer's money — masking does not apply. */}
          <HawkFigure value={ratePerMinuteKobo} size="sm" neverMasked />
          <HawkText variant="tiny" ink="muted">
            / min
          </HawkText>
        </div>
      )}
      {onClick && <HawkIcon icon={IconChevronRight} size={16} className="text-hawk-ink-disabled" />}
    </Tag>
  );
}

export function HawkProfessionalRowSkeleton() {
  return (
    <div className={ROW}>
      <HawkSkeleton circle width={40} height={40} />
      <div className="flex flex-1 flex-col gap-hawk-2">
        <HawkSkeletonLine widthFactor={0.45} height={13} />
        <HawkSkeletonLine widthFactor={0.7} height={10} />
      </div>
      <HawkSkeletonLine widthFactor={0.12} height={13} />
    </div>
  );
}

/* ── 2 · Transaction ──────────────────────────────────────────────────────── */

export interface HawkTransactionRowProps {
  title: string;
  subtitle?: string;
  amountKobo: HawkKobo;
  direction: HawkMoneyDirection;
  timestamp?: string;
  status?: HawkStatus;
  icon?: HawkIconComponent;
  onClick?: () => void;
  className?: string;
}

/**
 * A ledger line.
 *
 * Direction drives the ink strictly by sign, and debits render as **ink rather
 * than red** — red means *failed*, and a successful debit is not a failure. The
 * status badge carries whether it worked; the colour carries which way the
 * money moved. Conflating the two is how a working ledger comes to look alarming.
 */
export function HawkTransactionRow({
  title,
  subtitle,
  amountKobo,
  direction,
  timestamp,
  status,
  icon,
  onClick,
  className,
}: HawkTransactionRowProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(ROW, onClick && ROW_INTERACTIVE, className)}
    >
      {icon && (
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-hawk-sunken text-hawk-ink-muted">
          <HawkIcon icon={icon} size={16} />
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-hawk-1">
        <HawkText variant="body" ink="strong" clamp={1}>
          {title}
        </HawkText>
        <div className="flex items-center gap-hawk-3">
          {subtitle && (
            <HawkText variant="caption" ink="muted" clamp={1}>
              {subtitle}
            </HawkText>
          )}
          {status && <HawkStatusBadge status={status} size="sm" />}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-hawk-1">
        <HawkFigure
          value={amountKobo}
          size="sm"
          direction={direction}
          signed={direction === HawkMoneyDirection.CREDIT}
        />
        {timestamp && (
          <HawkText variant="tiny" ink="disabled" record>
            {timestamp}
          </HawkText>
        )}
      </div>
    </Tag>
  );
}

export function HawkTransactionRowSkeleton() {
  return (
    <div className={ROW}>
      <HawkSkeleton circle width={36} height={36} />
      <div className="flex flex-1 flex-col gap-hawk-2">
        <HawkSkeletonLine widthFactor={0.5} height={13} />
        <HawkSkeletonLine widthFactor={0.3} height={10} />
      </div>
      <HawkSkeletonLine widthFactor={0.15} height={13} />
    </div>
  );
}

/* ── 3 · Call history ─────────────────────────────────────────────────────── */

export interface HawkCallRowProps {
  name: string;
  avatarUrl?: string;
  /** Video rather than audio. */
  video?: boolean;
  /** Formatted duration — `12:04`. */
  duration?: string;
  timestamp?: string;
  status?: HawkStatus;
  costKobo?: HawkKobo;
  onClick?: () => void;
  className?: string;
}

export function HawkCallRow({
  name,
  avatarUrl,
  video = false,
  duration,
  timestamp,
  status,
  costKobo,
  onClick,
  className,
}: HawkCallRowProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(ROW, onClick && ROW_INTERACTIVE, className)}
    >
      <HawkAvatar name={name} src={avatarUrl} size="md" />
      <div className="flex min-w-0 flex-1 flex-col gap-hawk-1">
        <HawkText variant="body" ink="strong" clamp={1}>
          {name}
        </HawkText>
        <div className="flex items-center gap-hawk-3">
          <HawkIcon
            icon={video ? IconVideo : IconPhone}
            size={11}
            label={video ? 'Video call' : 'Audio call'}
            className="text-hawk-ink-disabled"
          />
          {duration && (
            <HawkText variant="caption" ink="muted" record>
              {duration}
            </HawkText>
          )}
          {status && <HawkStatusBadge status={status} size="sm" />}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-hawk-1">
        {costKobo !== undefined && <HawkFigure value={costKobo} size="sm" ink="muted" />}
        {timestamp && (
          <HawkText variant="tiny" ink="disabled" record>
            {timestamp}
          </HawkText>
        )}
      </div>
    </Tag>
  );
}

/* ── 4 · Chat thread ──────────────────────────────────────────────────────── */

export interface HawkChatRowProps {
  name: string;
  preview: string;
  avatarUrl?: string;
  timestamp?: string;
  unread?: number;
  presence?: HawkPresence;
  /** The last message is the viewer's own — shows "You: ". */
  ownLast?: boolean;
  onClick?: () => void;
  className?: string;
}

export function HawkChatRow({
  name,
  preview,
  avatarUrl,
  timestamp,
  unread = 0,
  presence,
  ownLast = false,
  onClick,
  className,
}: HawkChatRowProps) {
  const Tag = onClick ? 'button' : 'div';
  const hasUnread = unread > 0;

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(ROW, onClick && ROW_INTERACTIVE, className)}
    >
      <HawkAvatar name={name} src={avatarUrl} size="md" {...(presence ? { presence } : {})} />
      <div className="flex min-w-0 flex-1 flex-col gap-hawk-1">
        <HawkText variant="body" ink="strong" clamp={1}>
          {name}
        </HawkText>
        <HawkText
          variant="caption"
          // An unread thread's preview stays at full ink; a read one recedes.
          // That contrast is what makes an unread list scannable at a glance.
          ink={hasUnread ? 'default' : 'muted'}
          clamp={1}
          className={cn(hasUnread && 'font-medium')}
        >
          {ownLast ? `You: ${preview}` : preview}
        </HawkText>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-hawk-2">
        {timestamp && (
          <HawkText variant="tiny" ink={hasUnread ? 'accent' : 'disabled'} record>
            {timestamp}
          </HawkText>
        )}
        {hasUnread && (
          <span className="hawk-record inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-hawk-acc px-1 text-hawk-tiny font-bold tabular-nums text-hawk-acc-on">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </div>
    </Tag>
  );
}

/* ── 5 · Notification ─────────────────────────────────────────────────────── */

export interface HawkNotificationRowProps {
  title: string;
  body?: string;
  timestamp?: string;
  icon?: HawkIconComponent;
  semantic?: HawkSemantic;
  /** Unread — carries the accent dot and a tinted ground. */
  unread?: boolean;
  onClick?: () => void;
  className?: string;
}

export function HawkNotificationRow({
  title,
  body,
  timestamp,
  icon,
  semantic = HawkSemantic.NEUTRAL,
  unread = false,
  onClick,
  className,
}: HawkNotificationRowProps) {
  const tone = quartet(semantic);
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        ROW,
        'items-start',
        onClick && ROW_INTERACTIVE,
        unread && 'bg-hawk-acc-soft/40',
        className,
      )}
    >
      {icon && (
        <span
          className={cn(
            'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
            tone.softBg,
            tone.text,
          )}
        >
          <HawkIcon icon={icon} size={16} />
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-hawk-1">
        <HawkText variant="body" ink="strong" clamp={2} className={cn(unread && 'font-semibold')}>
          {title}
        </HawkText>
        {body && (
          <HawkText variant="caption" ink="muted" clamp={2}>
            {body}
          </HawkText>
        )}
        {timestamp && (
          <HawkText variant="tiny" ink="disabled" record>
            {timestamp}
          </HawkText>
        )}
      </div>
      {unread && <HawkDot semantic={HawkSemantic.INFO} size={7} label="Unread" />}
    </Tag>
  );
}

/* ── 6 · Rate ─────────────────────────────────────────────────────────────── */

export interface HawkRateRowProps {
  label: string;
  /** Per-minute rate in kobo. */
  amountKobo: HawkKobo;
  /** Minimum call length, in minutes. */
  minimumMinutes?: number;
  active?: boolean;
  onEdit?: () => void;
  trailing?: ReactNode;
  className?: string;
}

export function HawkRateRow({
  label,
  amountKobo,
  minimumMinutes,
  active = true,
  onEdit,
  trailing,
  className,
}: HawkRateRowProps) {
  return (
    <div className={cn(ROW, className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-hawk-1">
        <div className="flex items-center gap-hawk-3">
          <HawkText variant="body" ink="strong" clamp={1}>
            {label}
          </HawkText>
          {!active && <HawkBadge label="Paused" semantic={HawkSemantic.NEUTRAL} size="sm" />}
        </div>
        {minimumMinutes !== undefined && (
          <HawkText variant="caption" ink="muted">
            Minimum {minimumMinutes} min
          </HawkText>
        )}
      </div>
      <HawkFigure value={amountKobo} size="sm" neverMasked />
      <HawkText variant="tiny" ink="muted">
        / min
      </HawkText>
      {trailing}
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="hawk-focusable rounded-hawk-xs text-hawk-caption font-semibold text-hawk-acc hover:underline"
        >
          Edit
        </button>
      )}
    </div>
  );
}

/* ── 7 · Review ───────────────────────────────────────────────────────────── */

export interface HawkReviewRowProps {
  author: string;
  rating: number;
  comment?: string;
  timestamp?: string;
  avatarUrl?: string;
  /** Hides the author — a review shown on the reviewer's own profile. */
  anonymous?: boolean;
  trailing?: ReactNode;
  className?: string;
}

export function HawkReviewRow({
  author,
  rating,
  comment,
  timestamp,
  avatarUrl,
  anonymous = false,
  trailing,
  className,
}: HawkReviewRowProps) {
  const name = anonymous ? 'Anonymous' : author;

  return (
    <div className={cn(ROW, 'items-start', className)}>
      <HawkAvatar name={name} src={anonymous ? undefined : avatarUrl} size="sm" />
      <div className="flex min-w-0 flex-1 flex-col gap-hawk-2">
        <div className="flex items-center gap-hawk-3">
          <HawkText variant="label" ink="strong" clamp={1}>
            {name}
          </HawkText>
          <HawkRating value={rating} readOnly size={11} />
          {timestamp && (
            <HawkText variant="tiny" ink="disabled" record>
              {timestamp}
            </HawkText>
          )}
        </div>
        {comment && (
          <HawkText variant="caption" ink="muted" clamp={3}>
            {comment}
          </HawkText>
        )}
      </div>
      {trailing}
    </div>
  );
}

/* ── 8 · KYC item ─────────────────────────────────────────────────────────── */

export interface HawkKycItemRowProps {
  label: string;
  status: HawkStatus;
  description?: string;
  onClick?: () => void;
  className?: string;
}

export function HawkKycItemRow({
  label,
  status,
  description,
  onClick,
  className,
}: HawkKycItemRowProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(ROW, onClick && ROW_INTERACTIVE, className)}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-hawk-1">
        <HawkText variant="body" ink="strong" clamp={1}>
          {label}
        </HawkText>
        {description && (
          <HawkText variant="caption" ink="muted" clamp={1}>
            {description}
          </HawkText>
        )}
      </div>
      <HawkStatusBadge status={status} />
      {onClick && <HawkIcon icon={IconChevronRight} size={16} className="text-hawk-ink-disabled" />}
    </Tag>
  );
}

/* ── 9 · Minutes held ─────────────────────────────────────────────────────── */

export interface HawkMinutesHeldRowProps {
  title: string;
  /** Held amount in kobo. */
  amountKobo: HawkKobo;
  /** When the hold releases. */
  releasesAt?: string;
  subtitle?: string;
  className?: string;
}

/**
 * A held-funds row — escrow.
 *
 * The held amount renders in the muted ink rather than the credit green: it is
 * *not yet* the professional's money, and colouring it as a credit would
 * promise a balance they cannot withdraw.
 */
export function HawkMinutesHeldRow({
  title,
  amountKobo,
  releasesAt,
  subtitle,
  className,
}: HawkMinutesHeldRowProps) {
  return (
    <div className={cn(ROW, className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-hawk-1">
        <HawkText variant="body" ink="strong" clamp={1}>
          {title}
        </HawkText>
        {subtitle && (
          <HawkText variant="caption" ink="muted" clamp={1}>
            {subtitle}
          </HawkText>
        )}
        {releasesAt && (
          <HawkText variant="tiny" ink="disabled">
            Releases {releasesAt}
          </HawkText>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end">
        <HawkFigure value={amountKobo} size="sm" ink="muted" />
        <HawkText variant="tiny" ink="disabled">
          held
        </HawkText>
      </div>
    </div>
  );
}

/* ── 10 · Schedule proposal ───────────────────────────────────────────────── */

export interface HawkScheduleRowProps {
  /** "Tue 3 Sep". */
  date: string;
  /** "14:00 – 14:30". */
  time: string;
  /** Who proposed it. */
  proposedBy?: string;
  status?: HawkStatus;
  onAccept?: () => void;
  onDecline?: () => void;
  className?: string;
}

export function HawkScheduleRow({
  date,
  time,
  proposedBy,
  status,
  onAccept,
  onDecline,
  className,
}: HawkScheduleRowProps) {
  return (
    <div className={cn(ROW, 'items-start', className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-hawk-1">
        <div className="flex items-center gap-hawk-3">
          <HawkText variant="body" ink="strong" record>
            {date}
          </HawkText>
          <HawkText variant="body" ink="muted" record>
            {time}
          </HawkText>
        </div>
        {proposedBy && (
          <HawkText variant="caption" ink="muted">
            Proposed by {proposedBy}
          </HawkText>
        )}
        {status && (
          <div className="mt-hawk-1">
            <HawkStatusBadge status={status} size="sm" />
          </div>
        )}
      </div>
      {(onAccept || onDecline) && (
        <div className="flex shrink-0 items-center gap-hawk-3">
          {onDecline && (
            <button
              type="button"
              onClick={onDecline}
              className="hawk-focusable rounded-hawk-xs text-hawk-caption font-semibold text-hawk-ink-muted hover:underline"
            >
              Decline
            </button>
          )}
          {onAccept && (
            <button
              type="button"
              onClick={onAccept}
              className="hawk-focusable rounded-hawk-xs text-hawk-caption font-semibold text-hawk-acc hover:underline"
            >
              Accept
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** A generic row skeleton, for lists whose row type is not yet known. */
export function HawkRowSkeleton({ avatar = true }: { avatar?: boolean }) {
  return (
    <div className={ROW}>
      {avatar && <HawkSkeleton circle width={40} height={40} />}
      <div className="flex flex-1 flex-col gap-hawk-2">
        <HawkSkeletonLine widthFactor={0.5} height={13} />
        <HawkSkeletonLine widthFactor={0.75} height={10} />
      </div>
      <HawkSkeletonLine widthFactor={0.12} height={13} />
    </div>
  );
}
