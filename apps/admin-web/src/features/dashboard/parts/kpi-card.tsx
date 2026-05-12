import { AppText, cn } from '@ohlify/ui';
import type { LucideIcon } from '@icons';

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  Icon?: LucideIcon;
  tone?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

const TONE_BG: Record<NonNullable<KpiCardProps['tone']>, string> = {
  default: 'bg-secondary text-primary',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
};

/**
 * KPI tile: icon block on the left, label + value + hint stacked on the
 * right with explicit vertical rhythm. Each text line is its own block —
 * the value never sits inline with the label or the hint.
 */
export function KpiCard({ label, value, hint, Icon, tone = 'default', className }: KpiCardProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-4 rounded-lg border border-border bg-surface p-5',
        className,
      )}
    >
      {Icon && (
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-md',
            TONE_BG[tone],
          )}
        >
          <Icon size={20} />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <AppText
          variant="bodySmall"
          className="text-[11px] font-bold uppercase tracking-wider text-text-muted"
        >
          {label}
        </AppText>
        <AppText variant="header" className="text-3xl font-bold tabular-nums text-text-primary">
          {value}
        </AppText>
        {hint && (
          <AppText variant="bodySmall" className="text-text-muted">
            {hint}
          </AppText>
        )}
      </div>
    </div>
  );
}
