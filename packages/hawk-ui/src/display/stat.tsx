import type { ReactNode } from 'react';

import { HawkDataState, formatAge } from '../contracts/data-state.js';
import { HawkFigure } from '../foundation/figure.js';
import { HawkIcon } from '../foundation/icon.js';
import type { HawkKobo } from '../foundation/money.js';
import { HawkSkeletonLine } from '../foundation/skeleton.js';
import { HawkText } from '../foundation/text.js';
import { IconTrendingDown, IconTrendingUp } from '../icons/index.js';
import type { HawkIconComponent } from '../icons/index.js';
import { HawkSemantic, quartet } from '../theme/semantic.js';
import { cn } from '../utils/cn.js';

/**
 * The stat — one figure with its label.
 *
 * Three shapes, because the density genuinely differs: `HawkStat` for a card,
 * `HawkStatCompact` for a row of them, `HawkStatIcon` when the metric needs a
 * glyph to be scannable. They share the delta and freshness treatment.
 */
export interface HawkStatDelta {
  /** Signed percentage, e.g. -12.4. */
  percent: number;
  /** Period the comparison covers — "vs last week". */
  period?: string;
  /**
   * Whether a rise is good.
   *
   * Defaults to true, but refunds and failed calls are metrics where *up* is
   * bad — colouring those green because the number grew would be actively
   * misleading on an operator dashboard.
   */
  riseIsGood?: boolean;
}

function deltaTone(delta: HawkStatDelta): HawkSemantic {
  if (delta.percent === 0) return HawkSemantic.NEUTRAL;
  const rising = delta.percent > 0;
  const good = (delta.riseIsGood ?? true) === rising;
  return good ? HawkSemantic.SUCCESS : HawkSemantic.CRITICAL;
}

export function HawkStatDeltaBadge({ delta }: { delta: HawkStatDelta }) {
  const tone = quartet(deltaTone(delta));
  const rising = delta.percent > 0;

  return (
    <span className={cn('inline-flex items-center gap-hawk-2 text-hawk-caption font-semibold', tone.text)}>
      {delta.percent !== 0 && (
        <HawkIcon icon={rising ? IconTrendingUp : IconTrendingDown} size={12} />
      )}
      <span className="hawk-record tabular-nums">
        {rising ? '+' : ''}
        {delta.percent.toFixed(1)}%
      </span>
      {delta.period && <span className="font-normal text-hawk-ink-muted">{delta.period}</span>}
    </span>
  );
}

export interface HawkStatProps {
  label: string;
  /** Money in kobo, rendered through Figure so masking and flip apply. */
  valueKobo?: HawkKobo;
  /** A non-money value — a count, a percentage. */
  value?: ReactNode;
  delta?: HawkStatDelta;
  hint?: ReactNode;
  dataState?: HawkDataState;
  /** Age of the cached value, in ms — shown when stale. */
  ageMs?: number;
  className?: string;
}

/**
 * A stat in its own card.
 *
 * When `dataState` is `stale`, the age is shown beneath rather than the figure
 * being hidden or an error replacing it. CONTRACTS §10: stale is a first-class
 * state, and a number the user can still read beats an error that discards it.
 */
export function HawkStat({
  label,
  valueKobo,
  value,
  delta,
  hint,
  dataState = HawkDataState.FRESH,
  ageMs,
  className,
}: HawkStatProps) {
  if (dataState === HawkDataState.LOADING) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading"
        className={cn('flex flex-col gap-hawk-4', className)}
      >
        <HawkSkeletonLine widthFactor={0.4} height={10} />
        <HawkSkeletonLine widthFactor={0.65} height={28} />
      </div>
    );
  }

  const stale = dataState === HawkDataState.STALE;

  return (
    <div className={cn('flex flex-col gap-hawk-2', className)}>
      <HawkText variant="caption" ink="muted">
        {label}
      </HawkText>

      {valueKobo !== undefined ? (
        <HawkFigure value={valueKobo} size="lg" stale={stale} />
      ) : (
        <HawkText
          variant="display"
          ink="strong"
          record
          className={cn(stale && 'opacity-70')}
        >
          {value ?? '—'}
        </HawkText>
      )}

      {delta && <HawkStatDeltaBadge delta={delta} />}

      {stale && ageMs !== undefined ? (
        <HawkText variant="caption" ink="disabled">
          Saved data · {formatAge(ageMs)}
        </HawkText>
      ) : (
        hint && (
          <HawkText variant="caption" ink="muted">
            {hint}
          </HawkText>
        )
      )}
    </div>
  );
}

/** A stat sized for a row of several — label beneath, no card of its own. */
export function HawkStatCompact({
  label,
  value,
  valueKobo,
  delta,
  className,
}: Omit<HawkStatProps, 'dataState' | 'ageMs' | 'hint'>) {
  return (
    <div className={cn('flex flex-col gap-hawk-1', className)}>
      {valueKobo !== undefined ? (
        <HawkFigure value={valueKobo} size="sm" />
      ) : (
        <HawkText variant="medium" ink="strong" record>
          {value ?? '—'}
        </HawkText>
      )}
      <HawkText variant="caption" ink="muted">
        {label}
      </HawkText>
      {delta && <HawkStatDeltaBadge delta={delta} />}
    </div>
  );
}

/** A stat with a tinted glyph — used where a row of metrics needs scanning. */
export function HawkStatIcon({
  label,
  value,
  valueKobo,
  icon,
  semantic = HawkSemantic.NEUTRAL,
  delta,
  className,
}: Omit<HawkStatProps, 'dataState' | 'ageMs' | 'hint'> & {
  icon: HawkIconComponent;
  semantic?: HawkSemantic;
}) {
  const tone = quartet(semantic);

  return (
    <div className={cn('flex items-center gap-hawk-5', className)}>
      <span
        className={cn(
          'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-hawk-sm',
          tone.softBg,
          tone.onSoft,
        )}
      >
        <HawkIcon icon={icon} size={18} />
      </span>
      <div className="flex min-w-0 flex-col gap-hawk-1">
        {valueKobo !== undefined ? (
          <HawkFigure value={valueKobo} size="sm" />
        ) : (
          <HawkText variant="medium" ink="strong" record>
            {value ?? '—'}
          </HawkText>
        )}
        <HawkText variant="caption" ink="muted" clamp={1}>
          {label}
        </HawkText>
        {delta && <HawkStatDeltaBadge delta={delta} />}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkKeyValueProps {
  label: ReactNode;
  value: ReactNode;
  /** Stack rather than laying out on one line. */
  stacked?: boolean;
  /** Render the value in the record face — references, amounts, timestamps. */
  record?: boolean;
  className?: string;
}

/**
 * A key-value row — the detail-panel workhorse.
 *
 * The label takes the space it needs and the value takes the rest, rather than
 * a fixed split: "Reference" and "Bank account number" are very different
 * widths, and a fixed column makes one of them wrap for no reason.
 */
export function HawkKeyValue({
  label,
  value,
  stacked = false,
  record = false,
  className,
}: HawkKeyValueProps) {
  return (
    <div
      className={cn(
        stacked ? 'flex flex-col gap-hawk-1' : 'flex items-baseline justify-between gap-hawk-6',
        'py-hawk-3',
        className,
      )}
    >
      <HawkText variant="caption" ink="muted" className="shrink-0">
        {label}
      </HawkText>
      <span
        className={cn(
          'min-w-0 text-hawk-label font-medium text-hawk-ink-strong',
          record && 'hawk-record tabular-nums',
          !stacked && 'text-right',
        )}
      >
        {value}
      </span>
    </div>
  );
}

/** A price with its unit — "₦2,500 / min". */
export function HawkPrice({
  amountKobo,
  unit = 'min',
  size = 'md',
  className,
}: {
  amountKobo: HawkKobo;
  unit?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-baseline gap-hawk-2', className)}>
      {/* A public rate is not the viewer's money, so masking does not apply. */}
      <HawkFigure value={amountKobo} size={size} neverMasked />
      <HawkText variant="caption" ink="muted">
        / {unit}
      </HawkText>
    </span>
  );
}
