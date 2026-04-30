import { IconUser } from '@icons';

import { AppButton } from '../../primitives/app-button/app-button.js';
import { cn } from '../../utils/cn.js';
import { ProfessionalRating } from '../professional-rating/professional-rating.js';

interface ProfessionalListTileProps {
  name: string;
  role: string;
  rating: number;
  reviewCount: number;
  imageUrl?: string;
  onSchedule?: () => void;
  onTap?: () => void;
  className?: string;
}

/**
 * Mirrors mobile ProfessionalListTile.
 * 80×80 avatar + name + role + rating + Schedule call CTA.
 */
export function ProfessionalListTile({
  name,
  role,
  rating,
  reviewCount,
  imageUrl,
  onSchedule,
  onTap,
  className,
}: ProfessionalListTileProps) {
  const inner = (
    <div className="flex items-center gap-3.5">
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-surface">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <IconUser size={36} color="var(--ohl-text-muted)" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-sans text-sm font-medium text-text-black">{name}</p>
        <p className="mt-1 truncate font-sans text-xs font-medium text-text-muted">{role}</p>
        <div className="mt-2.5">
          <ProfessionalRating rating={rating} reviewCount={reviewCount} showDivider />
        </div>
      </div>
      <AppButton
        label="Schedule call"
        onPressed={onSchedule}
        radius={100}
        width={100}
        height={32}
        textStyle={{ fontSize: 10, fontWeight: 500 }}
      />
    </div>
  );

  return (
    <button
      type="button"
      onClick={onTap}
      className={cn('block w-full rounded-[20px] bg-background p-4 text-left', className)}
    >
      {inner}
    </button>
  );
}
