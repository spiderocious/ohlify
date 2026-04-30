import { IconUser } from '@icons';

import { cn } from '../../utils/cn.js';
import { ProfessionalRating } from '../professional-rating/professional-rating.js';

interface UpcomingCallCardProps {
  name: string;
  role: string;
  rating: number;
  reviewCount: number;
  imageUrl?: string;
  onTap?: () => void;
  className?: string;
}

/** Mirrors mobile UpcomingCallCard — 160px-wide avatar card. */
export function UpcomingCallCard({
  name,
  role,
  rating,
  reviewCount,
  imageUrl,
  onTap,
  className,
}: UpcomingCallCardProps) {
  return (
    <button
      type="button"
      onClick={onTap}
      className={cn(
        'flex w-40 flex-col items-center rounded-[20px] bg-background p-4 text-center',
        className,
      )}
    >
      <div className="h-24 w-24 overflow-hidden rounded-md bg-surface">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <IconUser size={40} color="var(--ohl-text-muted)" />
          </div>
        )}
      </div>
      <p className="mt-3 truncate font-sans text-base font-bold text-text-navy">{name}</p>
      <p className="mt-1 truncate font-sans text-[13px] font-normal text-text-muted">{role}</p>
      <div className="mt-2.5">
        <ProfessionalRating rating={rating} reviewCount={reviewCount} />
      </div>
    </button>
  );
}
