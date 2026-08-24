import { useId } from 'react';

import { HawkText } from '../foundation/text.js';
import { HawkSemantic, quartet } from '../theme/semantic.js';
import { cn } from '../utils/cn.js';

/**
 * Charts, drawn as SVG.
 *
 * No charting library. Adding one would be a new runtime dependency for the
 * whole admin app, and these five shapes — bar, line, donut, sparkline, and the
 * stacked variant — are a few dozen lines of path maths each. A dependency
 * carries version churn, bundle weight and a styling system that would fight
 * the token layer for control of colour.
 *
 * Every chart takes its colour from the semantic quartet rather than a palette
 * of its own, so a "success" bar is the same green as a success badge.
 */

export interface HawkChartPoint {
  label: string;
  value: number;
  semantic?: HawkSemantic;
}

/** Nice round axis maximum, so gridlines land on readable numbers. */
function niceMax(values: readonly number[]): number {
  const max = Math.max(0, ...values);
  if (max === 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  return Math.ceil(max / magnitude) * magnitude;
}

export interface HawkBarChartProps {
  data: ReadonlyArray<HawkChartPoint>;
  height?: number;
  semantic?: HawkSemantic;
  /** Format a value for the axis and tooltips. */
  format?: (value: number) => string;
  /** Horizontal bars — better when labels are long. */
  horizontal?: boolean;
  className?: string;
}

export function HawkBarChart({
  data,
  height = 180,
  semantic = HawkSemantic.INFO,
  format = (v) => String(v),
  horizontal = false,
  className,
}: HawkBarChartProps) {
  const max = niceMax(data.map((d) => d.value));

  if (horizontal) {
    return (
      <div className={cn('flex flex-col gap-hawk-4', className)}>
        {data.map((point) => {
          const tone = quartet(point.semantic ?? semantic);
          return (
            <div key={point.label} className="flex items-center gap-hawk-4">
              <span className="w-24 shrink-0 truncate text-hawk-caption text-hawk-ink-muted">
                {point.label}
              </span>
              <span className="h-4 flex-1 overflow-hidden rounded-hawk-xs bg-hawk-sunken">
                <span
                  className={cn('block h-full rounded-hawk-xs', tone.solidBg)}
                  style={{ width: `${(point.value / max) * 100}%` }}
                />
              </span>
              <span className="hawk-record w-16 shrink-0 text-right text-hawk-caption font-semibold tabular-nums text-hawk-ink-strong">
                {format(point.value)}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-hawk-3', className)}>
      <div
        className="flex items-end gap-hawk-3 border-b border-hawk-line"
        style={{ height }}
        role="img"
        aria-label={`Bar chart: ${data.map((d) => `${d.label} ${format(d.value)}`).join(', ')}`}
      >
        {data.map((point) => {
          const tone = quartet(point.semantic ?? semantic);
          return (
            <div key={point.label} className="flex flex-1 flex-col items-center justify-end gap-hawk-2">
              <span className="hawk-record text-hawk-tiny font-semibold tabular-nums text-hawk-ink-muted">
                {format(point.value)}
              </span>
              <div
                title={`${point.label}: ${format(point.value)}`}
                className={cn('hawk-motion w-full rounded-t-hawk-xs transition-[height] duration-hawk-base', tone.solidBg)}
                // A zero-value bar still gets 2px, so "nothing happened" reads
                // as a measured zero rather than a missing column.
                style={{ height: Math.max(2, (point.value / max) * (height - 24)) }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-hawk-3">
        {data.map((point) => (
          <span
            key={point.label}
            className="flex-1 truncate text-center text-hawk-tiny text-hawk-ink-muted"
          >
            {point.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkLineChartProps {
  data: ReadonlyArray<HawkChartPoint>;
  height?: number;
  semantic?: HawkSemantic;
  format?: (value: number) => string;
  /** Fill beneath the line. */
  area?: boolean;
  className?: string;
}

export function HawkLineChart({
  data,
  height = 180,
  semantic = HawkSemantic.INFO,
  format = (v) => String(v),
  area = true,
  className,
}: HawkLineChartProps) {
  const gradientId = useId();
  const tone = quartet(semantic);
  const max = niceMax(data.map((d) => d.value));
  const width = 100;

  if (data.length === 0) return null;

  const points = data.map((point, index) => {
    const x = data.length === 1 ? width / 2 : (index / (data.length - 1)) * width;
    const y = 100 - (point.value / max) * 100;
    return { x, y, point };
  });

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const fill = `${line} L${points[points.length - 1]?.x ?? 0},100 L${points[0]?.x ?? 0},100 Z`;

  return (
    <div className={cn('flex flex-col gap-hawk-3', className)}>
      <svg
        viewBox={`0 0 ${width} 100`}
        preserveAspectRatio="none"
        style={{ height }}
        className="w-full"
        role="img"
        aria-label={`Line chart: ${data.map((d) => `${d.label} ${format(d.value)}`).join(', ')}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={tone.cssBase} stopOpacity={0.22} />
            <stop offset="100%" stopColor={tone.cssBase} stopOpacity={0} />
          </linearGradient>
        </defs>

        {[0, 25, 50, 75, 100].map((y) => (
          <line key={y} x1={0} y1={y} x2={width} y2={y} stroke="var(--hawk-line)" strokeWidth={0.4} />
        ))}

        {area && <path d={fill} fill={`url(#${gradientId})`} />}
        <path
          d={line}
          fill="none"
          stroke={tone.cssBase}
          strokeWidth={1.6}
          strokeLinejoin="round"
          strokeLinecap="round"
          // Without this the stroke would be scaled by the non-uniform
          // viewBox and render thicker vertically than horizontally.
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="flex gap-hawk-3">
        {data.map((point) => (
          <span
            key={point.label}
            className="flex-1 truncate text-center text-hawk-tiny text-hawk-ink-muted"
          >
            {point.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkDonutChartProps {
  data: ReadonlyArray<HawkChartPoint>;
  size?: number;
  thickness?: number;
  format?: (value: number) => string;
  /** Content in the hole. */
  centre?: React.ReactNode;
  className?: string;
}

const SERIES: readonly HawkSemantic[] = [
  HawkSemantic.INFO,
  HawkSemantic.SUCCESS,
  HawkSemantic.CAUTION,
  HawkSemantic.CRITICAL,
  HawkSemantic.NEUTRAL,
];

export function HawkDonutChart({
  data,
  size = 160,
  thickness = 22,
  format = (v) => String(v),
  centre,
  className,
}: HawkDonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <div className={cn('flex items-center gap-hawk-7', className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" role="img" aria-label="Donut chart">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--hawk-sunken)"
            strokeWidth={thickness}
          />
          {total > 0 &&
            data.map((point, index) => {
              const tone = quartet(point.semantic ?? SERIES[index % SERIES.length] ?? HawkSemantic.NEUTRAL);
              const fraction = point.value / total;
              const dash = circumference * fraction;
              const segment = (
                <circle
                  key={point.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={tone.cssBase}
                  strokeWidth={thickness}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += dash;
              return segment;
            })}
        </svg>
        {centre && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">{centre}</div>
        )}
      </div>

      <ul className="flex min-w-0 flex-col gap-hawk-3">
        {data.map((point, index) => {
          const tone = quartet(point.semantic ?? SERIES[index % SERIES.length] ?? HawkSemantic.NEUTRAL);
          return (
            <li key={point.label} className="flex items-center gap-hawk-3">
              <span className={cn('h-2.5 w-2.5 shrink-0 rounded-sm', tone.solidBg)} />
              <HawkText variant="caption" ink="muted" clamp={1}>
                {point.label}
              </HawkText>
              <span className="hawk-record ml-auto text-hawk-caption font-semibold tabular-nums text-hawk-ink-strong">
                {format(point.value)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkSparklineProps {
  values: readonly number[];
  width?: number;
  height?: number;
  semantic?: HawkSemantic;
  className?: string;
}

/**
 * A sparkline — trend without axes, sized to sit inline in a row.
 *
 * Scaled to its own min/max rather than from zero: at this size the shape of
 * the movement is the entire signal, and anchoring to zero would flatten every
 * interesting series into a straight line.
 */
export function HawkSparkline({
  values,
  width = 72,
  height = 22,
  semantic = HawkSemantic.INFO,
  className,
}: HawkSparklineProps) {
  if (values.length < 2) return null;
  const tone = quartet(semantic);

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const path = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / span) * height;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <svg
      width={width}
      height={height}
      className={cn('shrink-0', className)}
      role="img"
      aria-label="Trend"
    >
      <path
        d={path}
        fill="none"
        stroke={tone.cssBase}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
