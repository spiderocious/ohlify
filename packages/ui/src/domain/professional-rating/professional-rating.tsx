import { IconStar } from '@icons';

import { cn } from '../../utils/cn.js';

interface ProfessionalRatingProps {
  rating: number;
  reviewCount: number;
  /** When true renders a vertical divider between rating and review count (list-tile variant). */
  showDivider?: boolean;
  className?: string;
}

/** Mirrors mobile ProfessionalRating — amber star + score + reviews. */
export function ProfessionalRating({
  rating,
  reviewCount,
  showDivider = false,
  className,
}: ProfessionalRatingProps) {
  return (
    <div className={cn('inline-flex items-center font-sans', className)}>
      <IconStar size={14} fill="var(--ohl-text-amber)" color="var(--ohl-text-amber)" />
      <span className="ml-1 text-[13px] font-bold text-text-amber">{rating.toString()}</span>
      {showDivider ? (
        <>
          <span className="mx-2 inline-block h-3 w-px bg-border" />
          <span className="text-[13px] font-normal text-text-muted">{reviewCount} Reviews</span>
        </>
      ) : (
        <span className="ml-1 text-xs font-normal text-text-muted">({reviewCount} Reviews)</span>
      )}
    </div>
  );
}
