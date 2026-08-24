import { useEffect, useState } from 'react';

import { HawkDurationFigure, HawkFigure } from '../foundation/figure.js';
import { HawkIcon } from '../foundation/icon.js';
import { costOfSeconds, formatDuration, type HawkKobo } from '../foundation/money.js';
import { HawkText } from '../foundation/text.js';
import { IconAlertTriangle } from '../icons/index.js';
import { HAWK_HAZARD, HawkSemantic, quartet } from '../theme/semantic.js';
import { cn } from '../utils/cn.js';

/**
 * Meter severity.
 *
 * Escalates through **hazard**, not critical. CONTRACTS §0.2: running low on
 * minutes is something the system reports, not an irreversible action the user
 * took, so it belongs in the warm family. Critical red stays reserved for
 * operator actions that cannot be undone.
 */
export const HawkMeterSeverity = {
  NORMAL: 'normal',
  WARNING: 'warning',
  HAZARD: 'hazard',
} as const;
export type HawkMeterSeverity =
  (typeof HawkMeterSeverity)[keyof typeof HawkMeterSeverity];

export interface HawkMeterProps {
  /** Elapsed seconds. */
  seconds: number;
  /** Per-second rate in kobo. */
  ratePerSecondKobo?: HawkKobo;
  /** Seconds of credit remaining; drives the severity escalation. */
  remainingSeconds?: number;
  /** Render on a dark surface — the in-call treatment. */
  onDark?: boolean;
  /** Hide the running cost, showing only elapsed time. */
  hideCost?: boolean;
  className?: string;
}

/** Below two minutes is a hazard; below five is a warning. */
function severityOf(remainingSeconds: number | undefined): HawkMeterSeverity {
  if (remainingSeconds === undefined) return HawkMeterSeverity.NORMAL;
  if (remainingSeconds <= 120) return HawkMeterSeverity.HAZARD;
  if (remainingSeconds <= 300) return HawkMeterSeverity.WARNING;
  return HawkMeterSeverity.NORMAL;
}

/**
 * The live meter — elapsed time and running cost during a call.
 *
 * The figures **flip** rather than tween (CONTRACTS §0.1), and they render in
 * the record face with tabular figures so the layout cannot jitter as digits
 * change. Both properties come from `HawkFigure`; the meter never formats a
 * number itself.
 *
 * The running cost honours global masking like any other money figure. That is
 * the point of §9 being ambient: a user who has hidden their balance has not
 * agreed to have it revealed the moment a call starts.
 */
export function HawkMeter({
  seconds,
  ratePerSecondKobo,
  remainingSeconds,
  onDark = false,
  hideCost = false,
  className,
}: HawkMeterProps) {
  const severity = severityOf(remainingSeconds);
  const tone =
    severity === 'hazard'
      ? HAWK_HAZARD
      : severity === 'warning'
        ? quartet(HawkSemantic.CAUTION)
        : undefined;

  return (
    <div className={cn('flex flex-col items-center gap-hawk-3', className)}>
      <HawkDurationFigure
        text={formatDuration(seconds)}
        size="lg"
        ink={onDark ? 'inverse' : 'strong'}
      />

      {!hideCost && ratePerSecondKobo !== undefined && (
        <HawkFigure
          value={costOfSeconds(ratePerSecondKobo, seconds)}
          size="sm"
          ink={onDark ? 'inverse-muted' : 'muted'}
        />
      )}

      {tone && remainingSeconds !== undefined && (
        <span
          className={cn(
            'inline-flex items-center gap-hawk-2 rounded-hawk-pill px-hawk-4 py-hawk-1',
            tone.softBg,
            tone.onSoft,
          )}
        >
          <HawkIcon icon={IconAlertTriangle} size={11} />
          <span className="hawk-record text-hawk-caption font-semibold tabular-nums">
            {formatDuration(remainingSeconds)} left
          </span>
        </span>
      )}
    </div>
  );
}

/**
 * A meter that ticks on its own.
 *
 * Provided because a caller wiring their own `setInterval` will reach for
 * `Date.now()` deltas and drift, or re-render the whole screen each second. The
 * ticking lives here, scoped to the one component that needs it.
 *
 * Stops on `running: false` rather than unmounting, so pausing a call does not
 * discard the elapsed value.
 */
export function HawkLiveMeter({
  startSeconds = 0,
  running = true,
  ...rest
}: Omit<HawkMeterProps, 'seconds'> & { startSeconds?: number; running?: boolean }) {
  const [seconds, setSeconds] = useState(startSeconds);

  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [running]);

  useEffect(() => setSeconds(startSeconds), [startSeconds]);

  return <HawkMeter seconds={seconds} {...rest} />;
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkProgressBarProps {
  /** 0–1. Omit for an indeterminate bar. */
  value?: number;
  semantic?: HawkSemantic;
  /** Track height in px. */
  height?: number;
  label?: string;
  /** Show the percentage beside the label. */
  showValue?: boolean;
  className?: string;
}

export function HawkProgressBar({
  value,
  semantic = HawkSemantic.SUCCESS,
  height = 6,
  label,
  showValue = false,
  className,
}: HawkProgressBarProps) {
  const tone = quartet(semantic);
  const clamped = value === undefined ? undefined : Math.min(1, Math.max(0, value));

  return (
    <div className={cn('flex w-full flex-col gap-hawk-2', className)}>
      {(label || showValue) && (
        <div className="flex items-baseline justify-between gap-hawk-4">
          {label && (
            <HawkText variant="caption" ink="muted">
              {label}
            </HawkText>
          )}
          {showValue && clamped !== undefined && (
            <HawkText variant="caption" ink="muted" record>
              {Math.round(clamped * 100)}%
            </HawkText>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={clamped === undefined ? undefined : Math.round(clamped * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="w-full overflow-hidden rounded-full bg-hawk-sunken"
        style={{ height }}
      >
        <div
          className={cn(
            'hawk-motion h-full rounded-full transition-[width] duration-hawk-base ease-hawk-standard',
            tone.solidBg,
            // An indeterminate bar shimmers in place rather than sliding, so it
            // never implies a position it does not know.
            clamped === undefined && 'hawk-skeleton w-1/3',
          )}
          style={clamped === undefined ? undefined : { width: `${clamped * 100}%` }}
        />
      </div>
    </div>
  );
}

export interface HawkProgressRingProps {
  /** 0–1. */
  value: number;
  size?: number;
  thickness?: number;
  semantic?: HawkSemantic;
  /** Content in the middle — usually a figure. */
  children?: React.ReactNode;
  className?: string;
}

/** A circular progress ring. Drawn as SVG — no charting dependency. */
export function HawkProgressRing({
  value,
  size = 64,
  thickness = 6,
  semantic = HawkSemantic.SUCCESS,
  children,
  className,
}: HawkProgressRingProps) {
  const tone = quartet(semantic);
  const clamped = Math.min(1, Math.max(0, value));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--hawk-sunken)"
          strokeWidth={thickness}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tone.cssBase}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          className="hawk-motion transition-[stroke-dashoffset] duration-hawk-base ease-hawk-standard"
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}
