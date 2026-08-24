import { cn } from '../utils/cn.js';

/**
 * The skeleton primitive. CONTRACTS §6.
 *
 * Every data-bearing component owns a skeleton **mirroring its own layout** —
 * not one shimmer box standing in for everything. A skeleton designed later
 * will not match the shape it stands in for, which is why each component ships
 * its own `.Skeleton` built from these parts.
 *
 * The pre-Hawk audit found no skeleton primitive on either platform at all.
 *
 * Shimmer is a 1.4s gradient sweep; `prefers-reduced-motion` and the gallery's
 * ambient toggle both collapse it to a static tint — a tint, not nothing, since
 * the placeholder still has to read as a placeholder.
 */
export interface HawkSkeletonProps {
  className?: string;
  /** Width as a CSS value, or a 0–1 fraction of the parent. */
  width?: string | number;
  height?: string | number;
  /** Fully round — for avatar placeholders. */
  circle?: boolean;
  /** Match the register's radius rather than the pill default. */
  square?: boolean;
}

function toCss(value: string | number | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'string') return value;
  return value <= 1 ? `${value * 100}%` : `${value}px`;
}

/** A single shimmering block. */
export function HawkSkeleton({
  className,
  width,
  height,
  circle = false,
  square = false,
}: HawkSkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'hawk-skeleton block',
        circle ? 'rounded-full' : square ? 'rounded-hawk-sm' : 'rounded-hawk-fixed-sm',
        className,
      )}
      style={{ width: toCss(width), height: toCss(height) }}
    />
  );
}

export interface HawkSkeletonLineProps {
  /** Fraction of the available width, 0–1. Defaults to 1. */
  widthFactor?: number;
  /** Line height in px. Defaults to 12 — one body line. */
  height?: number;
  className?: string;
}

/** A text line placeholder. */
export function HawkSkeletonLine({
  widthFactor = 1,
  height = 12,
  className,
}: HawkSkeletonLineProps) {
  return (
    <HawkSkeleton
      width={widthFactor}
      height={height}
      className={cn('rounded-hawk-xs', className)}
    />
  );
}

/**
 * A paragraph of lines, the last one short.
 *
 * The short last line is what makes a block read as *text* rather than as a
 * grey rectangle — the eye recognises the ragged edge before it reads anything.
 */
export function HawkSkeletonParagraph({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <span className={cn('flex flex-col gap-hawk-4', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <HawkSkeletonLine key={i} widthFactor={i === lines - 1 ? 0.55 : 1} />
      ))}
    </span>
  );
}

/**
 * Marks a subtree as a loading placeholder for assistive technology.
 *
 * `aria-busy` plus `aria-hidden` on the shapes means a screen reader announces
 * "busy" rather than reading out a wall of meaningless empty elements.
 */
export function HawkSkeletonRegion({
  children,
  className,
  label = 'Loading',
}: {
  children: React.ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div aria-busy="true" aria-label={label} role="status" className={className}>
      {children}
    </div>
  );
}
