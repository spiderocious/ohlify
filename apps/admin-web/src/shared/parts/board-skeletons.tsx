import {
  HawkAdminPanel,
  HawkSkeleton,
  HawkSkeletonLine,
  HawkSkeletonRegion,
  cn,
} from '@ohlify/hawk-ui';

/**
 * Skeletons for the dashboard boards.
 *
 * Every one mirrors the *shape* of what it replaces rather than showing a
 * spinner. Two reasons, and the second is the one that matters:
 *
 *   A spinner tells you something is happening. A skeleton tells you what is
 *   about to appear, so the eye is already in the right place when it does.
 *
 *   More practically, a skeleton the same height as its content means the page
 *   does not jump when data lands. A spinner collapses to nothing and shoves
 *   every section below it down the page — usually just as someone starts
 *   reading one.
 *
 * `HawkSkeletonRegion` carries `role="status"` and `aria-busy`, so a screen
 * reader announces the wait rather than reading an empty region.
 */

/** The four-cell KPI band, hairline-ruled like the real strip. */
export function KpiStripSkeleton({ cells = 4 }: { cells?: number }) {
  return (
    <HawkSkeletonRegion
      label="Loading metrics"
      className="hawk-board grid grid-cols-2 overflow-hidden rounded-hawk border border-hawk-line bg-hawk-paper md:grid-cols-4"
    >
      {Array.from({ length: cells }, (_, i) => (
        <div
          key={i}
          className="flex flex-col gap-hawk-4 border-b border-r border-hawk-line p-hawk-pad last:border-r-0 md:border-b-0"
        >
          <HawkSkeletonLine widthFactor={0.5} height={10} />
          <HawkSkeletonLine widthFactor={0.7} height={22} />
          <HawkSkeletonLine widthFactor={0.4} height={10} />
        </div>
      ))}
    </HawkSkeletonRegion>
  );
}

/**
 * A chart placeholder.
 *
 * Bars of varied height rather than one flat block: a rectangle reads as a
 * broken image, and a suggestion of a chart reads as a chart loading.
 */
export function ChartSkeleton({ height = 180 }: { height?: number }) {
  const bars = [0.5, 0.8, 0.35, 0.95, 0.65, 0.75, 0.45];
  return (
    <HawkSkeletonRegion
      label="Loading chart"
      className="flex items-end gap-hawk-3"
    >
      {bars.map((factor, i) => (
        <div key={i} className="flex-1" style={{ height: height * factor }}>
          <HawkSkeleton width="100%" height="100%" square />
        </div>
      ))}
    </HawkSkeletonRegion>
  );
}

/** A donut placeholder — a ring, not a disc, so it reads as the same shape. */
export function DonutSkeleton({ size = 128 }: { size?: number }) {
  return (
    <HawkSkeletonRegion label="Loading chart" className="flex justify-center py-hawk-4">
      <HawkSkeleton width={size} height={size} circle />
    </HawkSkeletonRegion>
  );
}

/** Stacked key-value rows, for the detail panels. */
export function RowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <HawkSkeletonRegion label="Loading" className="flex flex-col gap-hawk-4">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center justify-between gap-hawk-5">
          <HawkSkeletonLine widthFactor={0.4} height={11} />
          <HawkSkeletonLine widthFactor={0.2} height={11} />
        </div>
      ))}
    </HawkSkeletonRegion>
  );
}

/**
 * A table placeholder with a header rule, matching `HawkTable`'s own.
 *
 * `HawkTable` already renders its own skeleton from `dataState`, so this is
 * only for tables built by hand.
 */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <HawkSkeletonRegion label="Loading table" className="flex flex-col">
      <div className="flex gap-hawk-5 border-b border-hawk-line px-hawk-pad py-hawk-4">
        {Array.from({ length: columns }, (_, i) => (
          <div key={i} className="flex-1">
            <HawkSkeletonLine widthFactor={0.6} height={10} />
          </div>
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div
          key={r}
          className="flex gap-hawk-5 border-b border-hawk-line px-hawk-pad py-hawk-5 last:border-b-0"
        >
          {Array.from({ length: columns }, (_, c) => (
            <div key={c} className="flex-1">
              {/* Varied widths — a grid of identical bars reads as a pattern
                  rather than as text. */}
              <HawkSkeletonLine widthFactor={c === 0 ? 0.85 : 0.55} height={11} />
            </div>
          ))}
        </div>
      ))}
    </HawkSkeletonRegion>
  );
}

/** The attention band — cards of the same footprint as the real signals. */
export function AttentionSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <HawkSkeletonRegion
      label="Loading alerts"
      className="grid gap-hawk-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: cards }, (_, i) => (
        <div
          key={i}
          className="flex items-start gap-hawk-5 rounded-hawk border border-hawk-line p-hawk-pad"
        >
          <HawkSkeleton width={32} height={32} square />
          <div className="flex flex-1 flex-col gap-hawk-2">
            <HawkSkeletonLine widthFactor={0.6} height={14} />
            <HawkSkeletonLine widthFactor={0.35} height={10} />
            <HawkSkeletonLine widthFactor={0.9} height={10} />
          </div>
        </div>
      ))}
    </HawkSkeletonRegion>
  );
}

/** Wraps a skeleton in a panel so the section keeps its frame while loading. */
export function PanelSkeleton({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <HawkAdminPanel title={title} className={cn(className)}>
      {children}
    </HawkAdminPanel>
  );
}
