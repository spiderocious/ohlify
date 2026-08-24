import type { ReactNode } from 'react';

import { HawkDataState } from '../contracts/data-state.js';
import { HawkSparkline } from '../display/chart.js';
import { HawkStatDeltaBadge, type HawkStatDelta } from '../display/stat.js';
import { HawkFigure } from '../foundation/figure.js';
import { HawkIcon } from '../foundation/icon.js';
import type { HawkKobo } from '../foundation/money.js';
import { HawkSkeletonLine } from '../foundation/skeleton.js';
import { HawkText } from '../foundation/text.js';
import type { HawkIconComponent } from '../icons/index.js';
import { HawkSemantic, quartet } from '../theme/semantic.js';
import { cn } from '../utils/cn.js';

/**
 * The KPI strip.
 *
 * From the reference dashboards: cells divided by **hairline verticals, not
 * gaps** — one continuous band rather than a row of floating cards. That is the
 * BOARD register's whole thesis (rules carry structure, not surfaces), and it
 * is what stops a dashboard header from reading as six unrelated widgets.
 *
 * Each cell carries a label with a leading glyph, a large figure, a signed
 * delta, and a sparkline in its right half.
 */
export interface HawkKpi {
  key: string;
  label: string;
  /** Money in kobo — rendered through Figure so masking applies. */
  valueKobo?: HawkKobo;
  /** A non-money value. */
  value?: ReactNode;
  icon?: HawkIconComponent;
  delta?: HawkStatDelta;
  /** Trend data for the cell's sparkline. */
  trend?: readonly number[];
  semantic?: HawkSemantic;
  /**
   * Distinguishes a gross figure from a net one.
   *
   * The spec calls this out specifically: on a revenue dashboard, gross volume
   * and net revenue are different numbers that look identical in a cell, and an
   * operator reading the wrong one draws the wrong conclusion.
   */
  basis?: 'gross' | 'net';
}

export interface HawkKpiStripProps {
  items: ReadonlyArray<HawkKpi>;
  dataState?: HawkDataState;
  className?: string;
}

export function HawkKpiStrip({
  items,
  dataState = HawkDataState.FRESH,
  className,
}: HawkKpiStripProps) {
  if (dataState === HawkDataState.LOADING) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading metrics"
        className={cn(
          'hawk-board grid grid-cols-2 rounded-hawk border border-hawk-line bg-hawk-paper',
          'md:grid-cols-4',
          className,
        )}
      >
        {items.map((item) => (
          <div
            key={item.key}
            className="flex flex-col gap-hawk-4 border-b border-r border-hawk-line p-hawk-pad last:border-r-0"
          >
            <HawkSkeletonLine widthFactor={0.5} height={10} />
            <HawkSkeletonLine widthFactor={0.7} height={24} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'hawk-board grid grid-cols-2 overflow-hidden rounded-hawk border border-hawk-line bg-hawk-paper',
        'md:grid-cols-4',
        className,
      )}
    >
      {items.map((item) => (
        <HawkKpiCell key={item.key} kpi={item} />
      ))}
    </div>
  );
}

/**
 * One cell.
 *
 * Also exported on its own: a dashboard sometimes needs a single KPI beside
 * other content, and reaching for a one-item strip would carry the band's
 * borders into a place with nothing to divide.
 */
export function HawkKpiCell({ kpi, className }: { kpi: HawkKpi; className?: string }) {
  const tone = quartet(kpi.semantic ?? HawkSemantic.NEUTRAL);

  return (
    <div
      className={cn(
        // The hairline grid: every cell rules right and bottom, and the browser
        // trims the outer edges against the container's own border.
        'flex flex-col gap-hawk-3 border-b border-r border-hawk-line p-hawk-pad',
        'last:border-r-0 md:border-b-0',
        className,
      )}
    >
      <div className="flex items-center gap-hawk-3">
        {kpi.icon && (
          <span className={cn('inline-flex', tone.text)}>
            <HawkIcon icon={kpi.icon} size={13} />
          </span>
        )}
        <HawkText variant="overline" ink="muted" clamp={1}>
          {kpi.label}
        </HawkText>
        {kpi.basis && (
          <span className="rounded-hawk-xs bg-hawk-sunken px-hawk-2 text-hawk-tiny font-bold uppercase tracking-hawk-overline text-hawk-ink-muted">
            {kpi.basis}
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-hawk-4">
        <div className="flex min-w-0 flex-col gap-hawk-1">
          {kpi.valueKobo !== undefined ? (
            <HawkFigure value={kpi.valueKobo} size="md" />
          ) : (
            <HawkText variant="body-title" ink="strong" record className="font-bold">
              {kpi.value ?? '—'}
            </HawkText>
          )}
          {kpi.delta && <HawkStatDeltaBadge delta={kpi.delta} />}
        </div>

        {kpi.trend && kpi.trend.length > 1 && (
          <HawkSparkline
            values={kpi.trend}
            semantic={kpi.semantic ?? HawkSemantic.INFO}
            width={64}
            height={20}
          />
        )}
      </div>
    </div>
  );
}

/**
 * A standalone KPI card.
 *
 * The carded shape, for a dashboard that needs one metric to stand apart from
 * the strip — a headline figure above the band.
 */
export function HawkKpiCard({
  kpi,
  footer,
  className,
}: {
  kpi: HawkKpi;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'hawk-board flex flex-col gap-hawk-4 rounded-hawk border border-hawk-line bg-hawk-paper p-hawk-pad',
        className,
      )}
    >
      <HawkKpiCell kpi={kpi} className="border-0 p-0" />
      {footer && (
        <div className="border-t border-hawk-line pt-hawk-4">{footer}</div>
      )}
    </div>
  );
}
