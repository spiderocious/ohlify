import { IconBack, IconStar, IconUser } from '@icons';
import type { ReactNode } from 'react';


import { AppIconButton } from '../../primitives/app-icon-button/app-icon-button.js';
import { AppTag } from '../../primitives/app-tag/app-tag.js';
import { cn } from '../../utils/cn.js';

interface ProfessionalHeaderProps {
  name: string;
  role: string;
  rating: number;
  /** Hero/cover image URL. */
  imageUrl?: string;
  /** Default 300. */
  height?: number;
  available?: boolean;
  onBack?: () => void;
  onReviewsTap?: () => void;
  trailing?: ReactNode;
  className?: string;
}

/** Mirrors mobile ProfessionalHeader — hero image + scrim + name/role + rating badge. */
export function ProfessionalHeader({
  name,
  role,
  rating,
  imageUrl,
  height = 300,
  available = true,
  onBack,
  onReviewsTap,
  trailing,
  className,
}: ProfessionalHeaderProps) {
  return (
    <div className={cn('relative w-full overflow-hidden', className)} style={{ height }}>
      {imageUrl ? (
        <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-text-navy">
          <IconUser size={96} color="var(--ohl-border)" />
        </div>
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, transparent, rgb(0 0 0 / 0.45))' }}
      />
      {onBack ? (
        <div className="absolute left-4 top-3">
          <AppIconButton
            icon={<IconBack color="var(--ohl-text-jet)" size={20} />}
            variant="ghost"
            backgroundColor="var(--ohl-background)"
            size={44}
            onPressed={onBack}
            ariaLabel="Back"
          />
        </div>
      ) : null}
      {trailing ? <div className="absolute right-4 top-3">{trailing}</div> : null}

      <div className="absolute inset-x-4 bottom-4">
        {available ? <AppTag label="AVAILABLE" variant="solid" color="var(--ohl-success)" /> : null}
        <div className="mt-2.5 flex items-end gap-3">
          <div className="min-w-0 flex-1 text-white">
            <p className="truncate font-sans text-2xl font-extrabold">{name}</p>
            <p className="truncate font-sans text-sm text-white/90">{role}</p>
          </div>
          <button
            type="button"
            onClick={onReviewsTap}
            className="inline-flex items-center gap-1.5 rounded-pill bg-background px-3 py-2"
          >
            <IconStar size={14} fill="var(--ohl-text-amber)" color="var(--ohl-text-amber)" />
            <span className="font-sans text-sm font-bold text-text-amber">{rating}</span>
            <span className="font-sans text-sm font-semibold text-text-amber">View reviews</span>
          </button>
        </div>
      </div>
    </div>
  );
}
