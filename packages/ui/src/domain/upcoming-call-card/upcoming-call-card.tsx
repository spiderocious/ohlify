import { AppAvatar } from '../../primitives/app-avatar/app-avatar.js';
import { cn } from '../../utils/cn.js';
import { ProfessionalRating } from '../professional-rating/professional-rating.js';

interface UpcomingCallCardProps {
  name: string;
  role: string;
  rating: number;
  reviewCount: number;
  /** File-service key for the pro's avatar (NOT a URL). */
  imageKey?: string | null;
  onTap?: () => void;
  className?: string;
}

/** Mirrors mobile UpcomingCallCard — 160px-wide avatar card. */
export function UpcomingCallCard({
  name,
  role,
  rating,
  reviewCount,
  imageKey,
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
      <AppAvatar fileKey={imageKey} size={96} radius={8} alt={name} />
      <p className="mt-3 truncate font-sans text-base font-bold text-text-navy">{name}</p>
      <p className="mt-1 truncate font-sans text-[13px] font-normal text-text-muted">{role}</p>
      <div className="mt-2.5">
        <ProfessionalRating rating={rating} reviewCount={reviewCount} />
      </div>
    </button>
  );
}
