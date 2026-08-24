import { useEffect, useState, type ReactNode } from 'react';

import { HawkButton } from '../actions/button.js';
import { formatDuration } from '../foundation/money.js';
import { HawkIcon } from '../foundation/icon.js';
import { HawkText } from '../foundation/text.js';
import { IconAlertTriangle, IconCheck, IconInfo, IconWifiOff } from '../icons/index.js';
import type { HawkIconComponent } from '../icons/index.js';
import { HAWK_HAZARD, HawkSemantic, quartet } from '../theme/semantic.js';
import { cn } from '../utils/cn.js';

export interface HawkEmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: HawkIconComponent;
  /** The action that would fill it — "Find a professional". */
  action?: ReactNode;
  /** Compact, for an empty state inside a card rather than a screen. */
  compact?: boolean;
  className?: string;
}

/**
 * An empty state.
 *
 * Always carries an action when one exists. "No calls yet" is a dead end;
 * "No calls yet — find someone to talk to" is a screen the user can leave
 * productively. The action slot is optional only because some empties genuinely
 * have no next step (an admin queue that is legitimately clear).
 */
export function HawkEmptyState({
  title,
  description,
  icon = IconInfo,
  action,
  compact = false,
  className,
}: HawkEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-hawk-4 text-center',
        compact ? 'p-hawk-7' : 'p-hawk-12',
        className,
      )}
    >
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-hawk-sunken text-hawk-ink-muted">
        <HawkIcon icon={icon} size={22} />
      </span>
      <HawkText variant={compact ? 'body' : 'medium'} ink="strong">
        {title}
      </HawkText>
      {description && (
        <HawkText variant="caption" ink="muted" className="max-w-sm">
          {description}
        </HawkText>
      )}
      {action && <div className="mt-hawk-2">{action}</div>}
    </div>
  );
}

export interface HawkErrorStateProps {
  title?: ReactNode;
  description?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  /** Renders the offline treatment. */
  offline?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * A full error state.
 *
 * Reserved for a **cold cache** (CONTRACTS §10). If cached data exists, the
 * error belongs in a thin banner over that data — replacing readable content
 * with an error message discards something the user could still have used.
 */
export function HawkErrorState({
  title,
  description,
  onRetry,
  retryLabel = 'Try again',
  offline = false,
  compact = false,
  className,
}: HawkErrorStateProps) {
  const tone = quartet(offline ? HawkSemantic.CAUTION : HawkSemantic.CRITICAL);

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-hawk-4 text-center',
        compact ? 'p-hawk-7' : 'p-hawk-12',
        className,
      )}
    >
      <span
        className={cn(
          'inline-flex h-12 w-12 items-center justify-center rounded-full',
          tone.softBg,
          tone.text,
        )}
      >
        <HawkIcon icon={offline ? IconWifiOff : IconAlertTriangle} size={22} />
      </span>
      <HawkText variant={compact ? 'body' : 'medium'} ink="strong">
        {title ?? (offline ? 'You are offline' : 'Something went wrong')}
      </HawkText>
      <HawkText variant="caption" ink="muted" className="max-w-sm">
        {description ??
          (offline
            ? 'Check your connection and try again.'
            : 'We could not load this. It is not your fault.')}
      </HawkText>
      {onRetry && (
        <div className="mt-hawk-2">
          <HawkButton label={retryLabel} variant="outline" size="sm" onClick={onRetry} />
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkSuccessMomentProps {
  title: ReactNode;
  description?: ReactNode;
  /** The figure that succeeded — an amount, a duration. */
  highlight?: ReactNode;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
}

/**
 * The success moment — a completed withdrawal, a finished call.
 *
 * The one place the system permits celebration, and it stays restrained: a tick
 * and a figure. A payments product that throws confetti at a ₦2,000 withdrawal
 * reads as unserious about the money.
 */
export function HawkSuccessMoment({
  title,
  description,
  highlight,
  action,
  secondaryAction,
  className,
}: HawkSuccessMomentProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-hawk-5 p-hawk-9 text-center',
        className,
      )}
    >
      <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-hawk-success-soft text-hawk-success">
        <HawkIcon icon={IconCheck} size={30} strokeWidth={2.5} />
      </span>
      <HawkText variant="title" ink="strong">
        {title}
      </HawkText>
      {highlight}
      {description && (
        <HawkText variant="body" ink="muted" className="max-w-sm">
          {description}
        </HawkText>
      )}
      <div className="mt-hawk-4 flex w-full max-w-xs flex-col gap-hawk-4">
        {action}
        {secondaryAction}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkCountdownProps {
  /** Seconds remaining. */
  seconds: number;
  onComplete?: () => void;
  /** Below this many seconds, escalate to hazard. */
  hazardBelow?: number;
  label?: ReactNode;
  /** Count down on its own. */
  running?: boolean;
  className?: string;
}

/**
 * A countdown.
 *
 * Escalates through **hazard**, not critical — the same rule as the meter.
 * Time running out is something the system reports; it is not an irreversible
 * action the user took.
 *
 * Renders in the record face with tabular figures, so the width does not change
 * as the digits do.
 */
export function HawkCountdown({
  seconds,
  onComplete,
  hazardBelow = 30,
  label,
  running = true,
  className,
}: HawkCountdownProps) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => setRemaining(seconds), [seconds]);

  useEffect(() => {
    if (!running || remaining <= 0) return undefined;
    const timer = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [running, remaining]);

  // Fired from an effect rather than inside the tick, so the callback cannot
  // run during a state update.
  useEffect(() => {
    if (remaining === 0) onComplete?.();
  }, [remaining, onComplete]);

  const hazard = remaining <= hazardBelow;
  const tone = hazard ? HAWK_HAZARD : undefined;

  return (
    <span className={cn('inline-flex items-center gap-hawk-3', className)}>
      {label && (
        <HawkText variant="caption" ink="muted">
          {label}
        </HawkText>
      )}
      <span
        role="timer"
        aria-live={hazard ? 'assertive' : 'off'}
        className={cn(
          'hawk-record text-hawk-label font-bold tabular-nums',
          tone ? tone.text : 'text-hawk-ink-strong',
        )}
      >
        {formatDuration(Math.max(0, remaining))}
      </span>
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkStepperProgressProps {
  steps: readonly string[];
  /** Zero-based index of the current step. */
  current: number;
  className?: string;
}

/**
 * The horizontal step indicator — a compact progress bar with labels.
 *
 * For flows where the *position* is the whole message: onboarding, KYC, a
 * multi-page form. Each step is a rule that fills as you pass it.
 *
 * When a step needs to carry a timestamp or a status of its own, use
 * [HawkStepperVertical] instead. Cramming a time under a horizontal rule
 * truncates it at any realistic step count.
 */
export function HawkStepperProgress({ steps, current, className }: HawkStepperProgressProps) {
  return (
    <ol className={cn('flex w-full items-center gap-hawk-2', className)}>
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={step} className="flex min-w-0 flex-1 flex-col gap-hawk-2">
            <span
              className={cn(
                'hawk-motion h-1 w-full rounded-full transition-colors duration-hawk-base',
                done || active ? 'bg-hawk-acc' : 'bg-hawk-sunken',
              )}
            />
            <span
              className={cn(
                'truncate text-hawk-tiny font-medium',
                active
                  ? 'text-hawk-acc'
                  : done
                    ? 'text-hawk-ink-muted'
                    : 'text-hawk-ink-disabled',
              )}
            >
              {step}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkStep {
  label: string;
  /** When it happened — "14 Aug · 11:20". Rendered in the record face. */
  timestamp?: string;
  /** A line of detail beneath: who did it, why it is waiting. */
  description?: ReactNode;
  /**
   * Overrides the state derived from `current`.
   *
   * A flow is not always a straight line: a withdrawal can fail at step three
   * while steps one and two stand. Without this, a failure would have to be
   * rendered as "not reached yet", which is the opposite of what happened.
   */
  status?: HawkStepStatus;
}

export const HawkStepStatus = {
  DONE: 'done',
  CURRENT: 'current',
  PENDING: 'pending',
  FAILED: 'failed',
} as const;
export type HawkStepStatus = (typeof HawkStepStatus)[keyof typeof HawkStepStatus];

export interface HawkStepperVerticalProps {
  steps: readonly HawkStep[];
  /** Zero-based index of the current step. Ignored for steps setting `status`. */
  current?: number;
  className?: string;
}

/**
 * The vertical stepper — a timeline.
 *
 * For flows where each step carries a *record*: a withdrawal moving through
 * requested → approved → sent, a KYC submission, a dispute. The horizontal
 * variant shows position; this one shows history, which is why it has room for
 * a timestamp and a line of detail per step.
 *
 * Numbered nodes rather than ticks-only, because the sequence itself is
 * information on an audit-shaped surface: "step 3 of 4 failed" is a more useful
 * sentence than "the sent-to-bank one failed".
 *
 * The connector stops after the last node. A trailing line implies a step the
 * flow has not been told about.
 */
export function HawkStepperVertical({
  steps,
  current = 0,
  className,
}: HawkStepperVerticalProps) {
  const statusOf = (step: HawkStep, index: number): HawkStepStatus => {
    if (step.status) return step.status;
    if (index < current) return HawkStepStatus.DONE;
    if (index === current) return HawkStepStatus.CURRENT;
    return HawkStepStatus.PENDING;
  };

  return (
    <ol className={cn('flex flex-col', className)}>
      {steps.map((step, index) => {
        const status = statusOf(step, index);
        const last = index === steps.length - 1;

        const node =
          status === HawkStepStatus.DONE
            ? 'bg-hawk-success text-hawk-ink-inverse'
            : status === HawkStepStatus.CURRENT
              ? 'bg-hawk-acc text-hawk-acc-on'
              : status === HawkStepStatus.FAILED
                ? 'bg-hawk-critical text-hawk-ink-inverse'
                : 'bg-hawk-line-strong text-hawk-ink-inverse';

        return (
          <li key={`${step.label}-${index}`} className="flex gap-hawk-5">
            <div className="flex shrink-0 flex-col items-center">
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full',
                  'text-hawk-caption font-bold',
                  node,
                )}
              >
                {status === HawkStepStatus.DONE ? (
                  <HawkIcon icon={IconCheck} size={12} strokeWidth={3} />
                ) : status === HawkStepStatus.FAILED ? (
                  <HawkIcon icon={IconAlertTriangle} size={12} />
                ) : (
                  <span className="hawk-record tabular-nums">{index + 1}</span>
                )}
              </span>
              {!last && <span className="mt-hawk-2 w-0.5 flex-1 bg-hawk-line" />}
            </div>

            <div className={cn('flex min-w-0 flex-col gap-hawk-1', last ? 'pb-0' : 'pb-hawk-6')}>
              <HawkText
                variant="label"
                ink={status === HawkStepStatus.PENDING ? 'disabled' : 'strong'}
                className="font-semibold"
              >
                {step.label}
              </HawkText>
              {step.timestamp && (
                <HawkText variant="caption" ink="muted" record>
                  {step.timestamp}
                </HawkText>
              )}
              {step.description && (
                <HawkText
                  variant="caption"
                  ink={status === HawkStepStatus.FAILED ? undefined : 'muted'}
                  className={cn(status === HawkStepStatus.FAILED && 'text-hawk-critical')}
                >
                  {step.description}
                </HawkText>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkTooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom';
  className?: string;
}

/**
 * A tooltip.
 *
 * Shown on hover **and** focus. Hover-only would make it unreachable by
 * keyboard and invisible on touch, where the majority of this product's users
 * are — so a tooltip must never be the only place information lives.
 */
export function HawkTooltip({ content, children, side = 'top', className }: HawkTooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className={cn(
            'pointer-events-none absolute left-1/2 z-hawk-tooltip -translate-x-1/2 whitespace-nowrap',
            'rounded-hawk-xs bg-hawk-ink-strong px-hawk-4 py-hawk-2 text-hawk-caption text-hawk-ink-inverse',
            'shadow-hawk-popover',
            side === 'top' ? 'bottom-full mb-hawk-3' : 'top-full mt-hawk-3',
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
