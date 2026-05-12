import { IconStar } from '@icons';

import { cn } from '@ohlify/ui';

interface StarRatingProps {
  value: number | null | undefined;
  size?: number;
  className?: string;
}

/**
 * Renders a 5-star row, filling stars up to `value`. Used in tables
 * (size 14) and drawers (size 18).
 */
export function StarRating({ value, size = 14, className }: StarRatingProps) {
  const v = Math.round(Math.max(0, Math.min(5, value ?? 0)));
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} aria-label={`${v} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <IconStar
          key={i}
          size={size}
          color={i <= v ? '#f59e0b' : 'var(--ohl-border)'}
          fill={i <= v ? '#f59e0b' : 'transparent'}
        />
      ))}
    </span>
  );
}
