import { cn } from '@ohlify/ui';

export const StatusTone = {
  NEUTRAL: 'neutral',
  SUCCESS: 'success',
  WARNING: 'warning',
  DANGER: 'danger',
  INFO: 'info',
  MUTED: 'muted',
} as const;
export type StatusTone = (typeof StatusTone)[keyof typeof StatusTone];

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: 'bg-secondary text-text-primary',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger:  'bg-red-100 text-red-700',
  info:    'bg-blue-100 text-blue-700',
  muted:   'bg-surface-light text-text-muted',
};

interface StatusPillProps {
  label: string;
  tone?: StatusTone;
  className?: string;
}

/**
 * Single visual primitive used for every "this row is in state X" badge
 * across the admin app. Each module maps its enum → tone via a tiny
 * lookup right next to the data-table column definition; central tone
 * styles live here so colors are consistent.
 */
export function StatusPill({ label, tone = 'neutral', className }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
